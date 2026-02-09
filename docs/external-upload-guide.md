# 스트리밍 녹화 영상 외부 EC2 업로드 가이드

## 개요

스트리밍 녹화 완료 후 녹화 파일을 외부 EC2 서버로 자동 업로드하는 기능입니다.
대용량 파일(4GB~20GB+)을 안정적으로 전송하기 위해 **청크 업로드 방식**을 사용합니다.

---

## 아키텍처

```
┌─────────────────┐     청크 업로드      ┌──────────────────────┐
│  media-service  │ ─────────────────► │ external-storage-    │
│  (LiveKit 녹화)  │   (50MB 단위)       │ service (외부 EC2)   │
└─────────────────┘                     └──────────────────────┘
        │                                        │
        │ 로컬 저장                               │ 파일 저장
        ▼                                        ▼
   ./recordings/                          /data/storage/files/
```

### 업로드 플로우

```
1. 녹화 완료 (RecordingService.completeRecording)
        │
        ▼
2. 업로드 세션 초기화 (POST /api/upload/init)
        │ ← uploadId 발급
        ▼
3. 파일을 50MB 청크로 분할
        │
        ▼
4. 각 청크 순차 업로드 (POST /api/upload/chunk/{uploadId})
        │ ← 실패 시 해당 청크만 재시도 (최대 3회)
        ▼
5. 업로드 완료 요청 (POST /api/upload/complete/{uploadId})
        │ ← 서버에서 청크 병합 → 최종 파일 생성
        ▼
6. RecordingSession.externalUploadStatus = COMPLETED
```

---

## 설정 방법

### Media-Service 설정

#### application.yml (로컬 개발)

```yaml
external:
  upload:
    enabled: false  # 기본 비활성화
    server-url: http://localhost:8090/api/upload
    api-key: ""
    timeout: 300000      # 5분
    chunk-size: 52428800 # 50MB
    max-retries: 3
    retry-delay: 1000
```

#### application-prod.yml (운영)

```yaml
external:
  upload:
    enabled: ${EXTERNAL_UPLOAD_ENABLED:false}
    server-url: ${EXTERNAL_UPLOAD_URL}
    api-key: ${EXTERNAL_UPLOAD_API_KEY}
    timeout: ${EXTERNAL_UPLOAD_TIMEOUT:300000}
    chunk-size: ${EXTERNAL_UPLOAD_CHUNK_SIZE:52428800}
    max-retries: ${EXTERNAL_UPLOAD_MAX_RETRIES:3}
    retry-delay: ${EXTERNAL_UPLOAD_RETRY_DELAY:1000}
```

#### 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `EXTERNAL_UPLOAD_ENABLED` | 외부 업로드 활성화 | `false` |
| `EXTERNAL_UPLOAD_URL` | 외부 서버 API URL | - |
| `EXTERNAL_UPLOAD_API_KEY` | API 인증 키 | - |
| `EXTERNAL_UPLOAD_TIMEOUT` | 요청 타임아웃 (ms) | `300000` |
| `EXTERNAL_UPLOAD_CHUNK_SIZE` | 청크 크기 (bytes) | `52428800` (50MB) |
| `EXTERNAL_UPLOAD_MAX_RETRIES` | 최대 재시도 횟수 | `3` |
| `EXTERNAL_UPLOAD_RETRY_DELAY` | 재시도 간격 (ms) | `1000` |

---

### External-Storage-Service 설정

#### application.yml (로컬 개발)

```yaml
server:
  port: 8090

storage:
  base-path: ./storage/files      # 최종 파일 저장 경로
  chunk-path: ./storage/chunks    # 청크 임시 저장 경로
  base-url: http://localhost:8090/files

security:
  enabled: false
  api-key: ""
```

#### application-prod.yml (운영)

```yaml
storage:
  base-path: ${STORAGE_BASE_PATH:/data/storage/files}
  chunk-path: ${STORAGE_CHUNK_PATH:/data/storage/chunks}
  base-url: ${STORAGE_BASE_URL}

security:
  enabled: ${SECURITY_ENABLED:true}
  api-key: ${API_KEY}
```

#### 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `STORAGE_BASE_PATH` | 파일 저장 경로 | `/data/storage/files` |
| `STORAGE_CHUNK_PATH` | 청크 임시 경로 | `/data/storage/chunks` |
| `STORAGE_BASE_URL` | 파일 접근 URL | - |
| `SECURITY_ENABLED` | API Key 인증 활성화 | `true` |
| `API_KEY` | API 인증 키 | - |
| `STORAGE_DB_URL` | MySQL URL | - |
| `STORAGE_DB_USERNAME` | DB 사용자명 | - |
| `STORAGE_DB_PASSWORD` | DB 비밀번호 | - |

---

## API 명세

### External-Storage-Service API

#### 1. 업로드 세션 초기화

```http
POST /api/upload/init
Content-Type: application/json
X-API-Key: {api-key}

{
  "fileName": "studio_1_20240101_120000_abc12345.mp4",
  "fileSize": 5368709120,
  "totalChunks": 108,
  "recordingId": 123
}
```

**응답:**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Upload session initialized successfully"
}
```

#### 2. 청크 업로드

```http
POST /api/upload/chunk/{uploadId}
Content-Type: application/octet-stream
X-API-Key: {api-key}
X-Chunk-Index: 0

[binary chunk data - 50MB]
```

**응답:**
```json
{
  "success": true,
  "chunkIndex": 0,
  "uploadedChunks": 1,
  "totalChunks": 108,
  "message": "Chunk uploaded successfully"
}
```

#### 3. 업로드 완료 및 병합

```http
POST /api/upload/complete/{uploadId}
X-API-Key: {api-key}
```

**응답:**
```json
{
  "success": true,
  "fileUrl": "http://external-ec2:8090/files/studio_1_20240101_120000_abc12345.mp4",
  "fileSize": 5368709120,
  "message": "File upload completed and merged successfully"
}
```

#### 4. 파일 다운로드

```http
GET /files/{fileName}
```

#### 5. 파일 스트리밍

```http
GET /files/stream/{fileName}
```

---

## 데이터베이스 스키마

### recording_sessions 테이블 (Media-Service)

추가된 컬럼:

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `external_upload_status` | VARCHAR(20) | 외부 업로드 상태 (PENDING/UPLOADING/COMPLETED/FAILED) |
| `external_file_url` | VARCHAR(255) | 외부 서버 파일 URL |
| `external_uploaded_at` | DATETIME | 외부 업로드 완료 시간 |

### upload_sessions 테이블 (External-Storage-Service)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | BIGINT | PK |
| `upload_id` | VARCHAR(36) | UUID (외부 식별자) |
| `file_name` | VARCHAR(255) | 파일명 |
| `file_size` | BIGINT | 파일 크기 |
| `total_chunks` | INT | 총 청크 수 |
| `uploaded_chunks` | INT | 업로드된 청크 수 |
| `recording_id` | BIGINT | 녹화 세션 ID |
| `status` | VARCHAR(20) | 상태 (INITIALIZED/UPLOADING/MERGING/COMPLETED/FAILED/EXPIRED) |
| `chunk_storage_path` | VARCHAR(255) | 청크 저장 경로 |
| `final_file_path` | VARCHAR(255) | 최종 파일 경로 |
| `final_file_url` | VARCHAR(255) | 최종 파일 URL |
| `error_message` | TEXT | 오류 메시지 |
| `expires_at` | DATETIME | 세션 만료 시간 |
| `created_at` | DATETIME | 생성 시간 |
| `updated_at` | DATETIME | 수정 시간 |

---

## 배포 가이드

### External-Storage-Service 배포 (외부 EC2)

#### 1. 프로젝트 빌드

```bash
cd external-storage-service
./mvnw clean package -DskipTests
```

#### 2. Docker 빌드 (선택)

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/external-storage-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8090
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
```

#### 3. 실행

```bash
# 직접 실행
java -jar external-storage-service-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=prod \
  --STORAGE_BASE_PATH=/data/storage/files \
  --STORAGE_CHUNK_PATH=/data/storage/chunks \
  --STORAGE_BASE_URL=http://your-ec2-ip:8090/files \
  --SECURITY_ENABLED=true \
  --API_KEY=your-secure-api-key \
  --STORAGE_DB_URL=jdbc:mysql://localhost:3306/storage_db \
  --STORAGE_DB_USERNAME=storage_user \
  --STORAGE_DB_PASSWORD=storage_password
```

#### 4. 저장소 디렉토리 생성

```bash
sudo mkdir -p /data/storage/files
sudo mkdir -p /data/storage/chunks
sudo chown -R $USER:$USER /data/storage
```

### Media-Service 설정 (기존 서버)

```bash
# 환경 변수 설정
export EXTERNAL_UPLOAD_ENABLED=true
export EXTERNAL_UPLOAD_URL=http://your-ec2-ip:8090/api/upload
export EXTERNAL_UPLOAD_API_KEY=your-secure-api-key
```

---

## 모니터링

### 업로드 상태 확인

녹화 조회 API 응답에 외부 업로드 상태가 포함됩니다:

```json
{
  "recordingId": "abc-123",
  "status": "COMPLETED",
  "fileUrl": "http://media-server/recordings/...",
  "externalUploadStatus": "COMPLETED",
  "externalFileUrl": "http://external-ec2:8090/files/...",
  "externalUploadedAt": "2024-01-01T12:30:00"
}
```

### 로그 확인

**Media-Service:**
```
INFO  - Starting async upload: recordingId=123, filePath=/recordings/...
INFO  - Upload session created: uploadId=550e8400-...
DEBUG - Chunk uploaded: uploadId=550e8400-..., chunk=1/108
INFO  - All chunks uploaded successfully: uploadId=550e8400-..., totalChunks=108
INFO  - Upload completed: uploadId=550e8400-..., externalFileUrl=...
```

**External-Storage-Service:**
```
INFO  - Upload init request: fileName=..., fileSize=5368709120, totalChunks=108
INFO  - Upload session initialized: uploadId=550e8400-...
DEBUG - Chunk saved: uploadId=550e8400-..., chunkIndex=0, uploadedChunks=1/108
INFO  - Upload complete request: uploadId=550e8400-...
INFO  - Chunks merged: uploadId=550e8400-..., outputPath=/data/storage/files/...
```

### 만료 세션 정리

External-Storage-Service는 매시간 만료된 업로드 세션을 자동 정리합니다:
- 24시간 이상 경과한 미완료 세션
- 해당 세션의 청크 파일 삭제
- 세션 상태를 EXPIRED로 변경

---

## 테스트 순서

### 1단계: External-Storage-Service 단독 테스트 (외부 EC2)

외부 EC2 서버에서 external-storage-service만 먼저 테스트합니다.

```bash
# 1. 서비스 실행 (로컬 H2 DB 사용)
cd external-storage-service
./mvnw spring-boot:run

# 2. 헬스 체크
curl http://localhost:8090/api/upload/health
# 응답: OK

# 3. 업로드 세션 초기화 테스트
curl -X POST http://localhost:8090/api/upload/init \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","fileSize":1048576,"totalChunks":1}'
# 응답: {"uploadId":"xxx-xxx-xxx","message":"Upload session initialized successfully"}

# 4. 청크 업로드 테스트 (1MB 테스트 파일)
dd if=/dev/zero of=test_chunk.bin bs=1M count=1
curl -X POST http://localhost:8090/api/upload/chunk/{uploadId} \
  -H "Content-Type: application/octet-stream" \
  -H "X-Chunk-Index: 0" \
  --data-binary @test_chunk.bin
# 응답: {"success":true,"chunkIndex":0,"uploadedChunks":1,"totalChunks":1,...}

# 5. 업로드 완료 테스트
curl -X POST http://localhost:8090/api/upload/complete/{uploadId}
# 응답: {"success":true,"fileUrl":"http://localhost:8090/files/test.mp4",...}

# 6. 파일 다운로드 테스트
curl -I http://localhost:8090/files/test.mp4
# 응답: HTTP/1.1 200 OK, Content-Length: 1048576
```

### 2단계: Media-Service 단독 테스트 (업로드 비활성화)

```bash
# external.upload.enabled=false (기본값)로 기존 녹화 기능이 정상 작동하는지 확인
# 녹화 시작 → 중지 → 완료 플로우 테스트
```

### 3단계: 통합 테스트 (연동)

외부 EC2 서버가 준비된 후 진행합니다.

```bash
# 1. External-Storage-Service 실행 (외부 EC2)
java -jar external-storage-service.jar --spring.profiles.active=prod

# 2. Media-Service 환경 변수 설정
export EXTERNAL_UPLOAD_ENABLED=true
export EXTERNAL_UPLOAD_URL=http://{외부EC2_IP}:8090/api/upload
export EXTERNAL_UPLOAD_API_KEY=your-api-key

# 3. Media-Service 재시작

# 4. 스트리밍 녹화 테스트
#    - 스트리밍 시작
#    - 녹화 시작 API 호출
#    - 녹화 중지 API 호출
#    - 녹화 완료 웹훅 수신 후 자동 업로드 확인

# 5. 업로드 상태 확인
curl http://localhost:8082/api/media/record/{recordingId}
# externalUploadStatus: "COMPLETED" 확인
# externalFileUrl: 외부 서버 URL 확인

# 6. 외부 서버에서 파일 확인
curl -I http://{외부EC2_IP}:8090/files/{fileName}
```

### 테스트 체크리스트

| 단계 | 항목 | 확인 |
|------|------|------|
| 1 | External-Storage-Service 헬스 체크 | [ ] |
| 1 | 업로드 세션 초기화 API | [ ] |
| 1 | 청크 업로드 API | [ ] |
| 1 | 업로드 완료/병합 API | [ ] |
| 1 | 파일 다운로드 API | [ ] |
| 2 | Media-Service 녹화 기능 (업로드 비활성화) | [ ] |
| 3 | 네트워크 연결 (Media → External EC2) | [ ] |
| 3 | API Key 인증 | [ ] |
| 3 | 녹화 완료 후 자동 업로드 | [ ] |
| 3 | 업로드 상태 조회 | [ ] |
| 3 | 대용량 파일 테스트 (1GB+) | [ ] |

---

## 문제 해결

### 업로드 실패 시

1. **네트워크 오류**: 청크 업로드는 자동 재시도 (최대 3회, exponential backoff)
2. **일부 청크 실패**: 실패한 청크만 재전송
3. **전체 실패**: `externalUploadStatus = FAILED`로 기록, 로그 확인

### 수동 재업로드

현재 자동 재업로드는 지원하지 않습니다. 필요시 수동으로 처리하거나, 별도의 재시도 스케줄러를 구현해야 합니다.

### 디스크 공간 부족

- External-Storage-Service의 청크 정리 스케줄러가 만료된 청크를 자동 삭제
- 완료된 업로드의 청크는 병합 후 즉시 삭제

---

## 관련 파일

### Media-Service

| 파일 | 설명 |
|------|------|
| `recording/entity/UploadStatus.java` | 업로드 상태 enum |
| `recording/config/ExternalUploadConfig.java` | 외부 업로드 설정 |
| `recording/service/ChunkedUploadService.java` | 청크 업로드 서비스 |
| `recording/entity/RecordingSession.java` | 녹화 세션 엔티티 (외부 업로드 필드 포함) |
| `recording/service/RecordingService.java` | 녹화 서비스 (업로드 트리거) |
| `global/config/AsyncConfig.java` | 비동기 스레드 풀 설정 |

### External-Storage-Service

| 파일 | 설명 |
|------|------|
| `upload/controller/ChunkReceiveController.java` | 청크 수신 API |
| `upload/controller/FileDownloadController.java` | 파일 다운로드 API |
| `upload/service/ChunkStorageService.java` | 청크 저장/병합 서비스 |
| `upload/entity/UploadSession.java` | 업로드 세션 엔티티 |
| `upload/config/StorageConfig.java` | 저장소 설정 |
| `upload/config/SecurityConfig.java` | API Key 인증 |
