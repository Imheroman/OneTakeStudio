# AI 쇼츠 시스템 설정 체크리스트

## 로컬 테스트 환경 설정

### 1. 사전 요구사항

- [ ] Java 21
- [ ] Python 3.10+
- [ ] MySQL 8.0
- [ ] Redis

### 2. 데이터베이스

```bash
# core_db - JPA가 테이블 자동 생성 (ddl-auto: update)
# media_db - JPA가 테이블 자동 생성 (ddl-auto: update)
```

- [ ] core_db 데이터베이스 존재 확인
- [ ] media_db 데이터베이스 존재 확인
- [ ] 서비스 시작 후 테이블 자동 생성 확인

### 3. 저장소 폴더 생성

```bash
# Windows
mkdir C:\storage\recordings
mkdir C:\storage\shorts

# Linux/Mac
mkdir -p /mnt/storage/recordings
mkdir -p /mnt/storage/shorts
```

- [ ] recordings 폴더 생성
- [ ] shorts 폴더 생성
- [ ] 테스트용 녹화 파일 준비 (mp4)

### 4. 서비스 실행 순서

```bash
# 1. Eureka Server
cd eureka-server && ./mvnw spring-boot:run

# 2. Core Service
cd core-service && ./mvnw spring-boot:run

# 3. Media Service
cd media-service && ./mvnw spring-boot:run

# 4. API Gateway
cd api-gateway && ./mvnw spring-boot:run

# 5. AI Service (별도 터미널)
cd AI && pip install -r requirements.txt && uvicorn api:app --port 8000
```

- [ ] Eureka Server (8761)
- [ ] Core Service (8080)
- [ ] Media Service (8082)
- [ ] API Gateway (60000)
- [ ] AI Service (8000)

### 5. 환경 변수 (선택사항)

로컬 테스트 시 기본값 사용 가능. 필요 시 IDE에서 설정:

```env
# Core Service
AI_SERVICE_URL=http://localhost:8000
STORAGE_BASE_PATH=C:/storage

# Media Service
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devkey-secret-for-livekit-min-32-chars
```

### 6. 테스트 API 호출

```bash
# 1. 로그인하여 토큰 획득
curl -X POST http://localhost:60000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}'

# 2. 쇼츠 생성 요청 (토큰 필요)
curl -X POST http://localhost:60000/api/ai/shorts/generate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"recordingId":"your-recording-id","needSubtitles":true}'

# 3. 상태 확인
curl http://localhost:60000/api/ai/shorts/jobs/{jobId} \
  -H "Authorization: Bearer {token}"
```

---

## 확인 체크리스트

### 서비스 연결

- [ ] Eureka 대시보드에서 모든 서비스 등록 확인 (http://localhost:8761)
- [ ] API Gateway CORS 동작 확인
- [ ] AI 서비스 헬스체크: `curl http://localhost:8000/health`

### 마커 시스템

- [ ] 마커 생성 API 동작 확인
- [ ] 마커 조회 API 동작 확인
- [ ] ChatHighlightDetector 로그 확인 (채팅 급증 감지)

### AI 연동

- [ ] 쇼츠 생성 요청 성공
- [ ] AI 서비스 로그에서 요청 수신 확인
- [ ] Webhook 수신 확인
- [ ] 출력 파일 생성 확인

---

## 다음 단계

1. **프론트엔드 UI 구현**
   - 쇼츠 생성 버튼
   - 진행 상태 표시
   - 결과 미리보기

2. **AI 모델 최적화**
   - 얼굴 인식 정확도 개선
   - 자막 생성 품질 개선
   - 처리 속도 최적화

3. **운영 환경 배포**
   - S3 저장소 연동
   - k3s 배포 설정
   - 모니터링 설정
