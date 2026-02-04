# AI 쇼츠 생성 시스템 가이드

## 개요

방송 녹화 영상에서 하이라이트 구간을 자동으로 추출하여 세로형 쇼츠 영상을 생성하는 시스템입니다.

## 아키텍처

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│ Core Service│────▶│  AI Service │
│  (React)    │     │  (Spring)   │     │  (FastAPI)  │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                    │
                    ┌──────▼──────┐             │
                    │Media Service│◀────────────┘
                    │  (Spring)   │     Webhook
                    └─────────────┘
```

## 전체 워크플로우

### 1. 채팅 급증 감지 (자동)

```
방송 중 채팅 수신
    ↓
ChatService.sendMessage()
    ↓
ChatHighlightDetector.onChatMessage()
    ↓
10초 윈도우 슬라이싱으로 채팅량 분석
    ↓
평균 대비 2.5배 이상 급증 시
    ↓
MarkerService.createChatSpikeMarker() → 자동 마커 생성
```

### 2. 쇼츠 생성 요청

```
POST /api/ai/shorts/generate
{
  "recordingId": "녹화 ID",
  "needSubtitles": true,
  "subtitleLang": "ko"
}
    ↓
Core Service: 마커 조회 (Media Service)
    ↓
마커 기반 영상 구간 계산 (상위 3개)
    ↓
AI Service에 비동기 요청
    ↓
응답: { "jobId": "...", "status": "accepted" }
```

### 3. AI 처리 및 Webhook

```
AI Service: 영상 처리 (얼굴 크롭, 자막 생성 등)
    ↓
처리 완료 시 Webhook 호출
POST /api/ai/webhook
{
  "job_id": "...",
  "video_id": "short_1",
  "status": "completed",
  "result": { "output_video": "/path/to/output.mp4" }
}
    ↓
Core Service: 결과 저장 + 알림 생성
```

---

## 남은 작업 목록

### 1. AI 서버 (Python/FastAPI)

- [ ] `AI/` 폴더의 FastAPI 서버 실행 환경 구성
- [ ] 필요 패키지 설치 (`requirements.txt` 확인)
- [ ] GPU/CUDA 환경 설정 (선택사항)
- [ ] 영상 처리 파이프라인 테스트

**실행 방법:**
```bash
cd AI
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000
```

**주요 엔드포인트:**
- `POST /shorts/process` - 쇼츠 생성 요청

### 2. 데이터베이스

- [ ] `shorts_jobs` 테이블 생성 (core_db)
- [ ] `shorts_results` 테이블 생성 (core_db)
- [ ] `markers` 테이블 생성 (media_db)

**DDL (참고용 - JPA ddl-auto: update로 자동 생성):**
```sql
-- core_db
CREATE TABLE shorts_jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(36) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    recording_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_count INT DEFAULT 3,
    completed_count INT DEFAULT 0,
    need_subtitles BOOLEAN DEFAULT TRUE,
    subtitle_lang VARCHAR(10) DEFAULT 'ko',
    error_message VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE shorts_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    result_id VARCHAR(36) UNIQUE NOT NULL,
    job_id BIGINT NOT NULL,
    video_id VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    output_path VARCHAR(500),
    thumbnail_path VARCHAR(500),
    title VARCHAR(200),
    duration_sec DOUBLE,
    processing_time_sec DOUBLE,
    error_message VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES shorts_jobs(id)
);

-- media_db
CREATE TABLE markers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    marker_id VARCHAR(36) UNIQUE NOT NULL,
    studio_id BIGINT NOT NULL,
    recording_id VARCHAR(36),
    user_id BIGINT,
    timestamp_sec DOUBLE NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    label VARCHAR(100),
    chat_spike_ratio DOUBLE,
    used_for_shorts BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3. 프론트엔드

- [ ] 쇼츠 생성 버튼 UI
- [ ] 생성 진행 상태 표시
- [ ] 완료된 쇼츠 목록 조회
- [ ] 쇼츠 미리보기/다운로드

**API 호출 예시:**
```typescript
// 쇼츠 생성 요청
const response = await api.post('/api/ai/shorts/generate', {
  recordingId: 'xxx-xxx-xxx',
  needSubtitles: true,
  subtitleLang: 'ko'
});
const { jobId } = response.data.data;

// 상태 폴링
const status = await api.get(`/api/ai/shorts/jobs/${jobId}`);
// status.data.data.shorts[0].outputPath
```

### 4. 저장소 설정

- [ ] 로컬 테스트: `storage.base-path` 경로 생성
- [ ] 녹화 파일 경로 확인
- [ ] 쇼츠 출력 경로 확인

**로컬 테스트 경로:**
```
C:/storage/
├── recordings/        # 녹화 원본
│   └── {recordingId}.mp4
└── shorts/            # 쇼츠 출력
    └── {jobId}/
        ├── short_1.mp4
        ├── short_2.mp4
        └── short_3.mp4
```

### 5. 환경 변수 설정

**core-service:**
```env
AI_SERVICE_URL=http://localhost:8000
AI_WEBHOOK_URL=http://localhost:8080/api/ai/webhook
STORAGE_BASE_PATH=C:/storage
```

**application.yml에서 확인:**
- `ai.service.url` - AI 서버 주소
- `ai.webhook.url` - Webhook 수신 주소
- `storage.base-path` - 저장소 경로

---

## 테스트 시나리오

### 시나리오 1: 마커 없이 쇼츠 생성

1. 녹화 파일이 있는 상태에서 쇼츠 생성 요청
2. 마커가 없으므로 AI가 자동으로 하이라이트 선정
3. 전체 영상을 AI에 전달

### 시나리오 2: 채팅 급증 마커로 쇼츠 생성

1. 방송 중 채팅 급증 발생 → 자동 마커 생성
2. 녹화 종료 후 쇼츠 생성 요청
3. 마커 기반으로 상위 3개 구간 선정
4. 해당 구간만 AI에 전달

### 시나리오 3: 수동 마커로 쇼츠 생성

1. 사용자가 방송 중 "마킹" 버튼 클릭
2. 해당 타임스탬프에 수동 마커 생성
3. 녹화 종료 후 쇼츠 생성 시 수동 마커 포함

---

## API 명세

### 쇼츠 생성 요청

```http
POST /api/ai/shorts/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "recordingId": "녹화 UUID",
  "needSubtitles": true,
  "subtitleLang": "ko"
}
```

**응답:**
```json
{
  "success": true,
  "message": "쇼츠 생성이 시작되었습니다",
  "data": {
    "jobId": "job-uuid",
    "status": "accepted",
    "message": "쇼츠 생성이 시작되었습니다. 3개의 구간을 처리합니다."
  }
}
```

### 상태 조회

```http
GET /api/ai/shorts/jobs/{jobId}
Authorization: Bearer {token}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "jobId": "job-uuid",
    "status": "processing",
    "totalCount": 3,
    "completedCount": 1,
    "shorts": [
      {
        "videoId": "short_1",
        "status": "completed",
        "outputPath": "/storage/shorts/job-uuid/short_1.mp4"
      },
      {
        "videoId": "short_2",
        "status": "processing"
      },
      {
        "videoId": "short_3",
        "status": "pending"
      }
    ]
  }
}
```

### 마커 생성 (수동)

```http
POST /api/media/markers
X-User-Id: {userId}
Content-Type: application/json

{
  "studioId": 123,
  "recordingId": "recording-uuid",
  "timestampSec": 930.5,
  "label": "하이라이트 구간"
}
```

### 마커 조회

```http
GET /api/media/markers/recording/{recordingId}
```

---

## S3 마이그레이션 가이드

로컬 저장소에서 S3로 전환 시 변경 필요 사항:

### 1. application.yml 추가

```yaml
aws:
  s3:
    bucket: onetake-studio-bucket
    region: ap-northeast-2
    access-key: ${AWS_ACCESS_KEY}
    secret-key: ${AWS_SECRET_KEY}
```

### 2. 코드 변경

| 파일 | 변경 내용 |
|------|----------|
| `AiShortsService.java` | `storageBasePath` → S3 bucket path |
| `Recording.getFilePath()` | 로컬 경로 → S3 presigned URL |
| AI 서버 payload | `output_dir` → S3 path |
| Webhook 처리 | `outputPath` → S3 URL |

### 3. AI 서버 (Python)

```python
import boto3

s3 = boto3.client('s3')
# 입력 파일 다운로드
s3.download_file(bucket, input_key, local_path)
# 출력 파일 업로드
s3.upload_file(output_path, bucket, output_key)
```

### 4. 프론트엔드

```typescript
// 로컬
const videoUrl = `/api/storage/shorts/${jobId}/${videoId}.mp4`;

// S3
const videoUrl = `https://${bucket}.s3.${region}.amazonaws.com/shorts/${jobId}/${videoId}.mp4`;
// 또는 CloudFront CDN URL
```

---

## 트러블슈팅

### AI 서버 연결 실패

```
ERROR: AI 서비스 연결 실패
```

**해결:**
1. AI 서버 실행 확인: `curl http://localhost:8000/health`
2. `AI_SERVICE_URL` 환경변수 확인
3. 방화벽/네트워크 설정 확인

### Webhook 수신 실패

```
WARN: Job을 찾을 수 없음
```

**해결:**
1. `AI_WEBHOOK_URL`이 AI 서버에서 접근 가능한지 확인
2. Docker 환경이면 `host.docker.internal` 사용
3. jobId가 올바르게 전달되는지 확인

### 마커가 조회되지 않음

**해결:**
1. Media Service 실행 확인
2. API Gateway 라우팅 확인 (`/api/media/markers/**`)
3. `MEDIA_SERVICE_URL` 환경변수 확인
