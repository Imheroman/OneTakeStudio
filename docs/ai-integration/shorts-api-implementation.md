# AI 숏츠 생성 API 구현

> 작성일: 2026-01-31
> 브랜치: be-ai

---

## 1. 구현 목적

### 왜 필요한가?
1. **자동 하이라이트 추출**: 긴 영상에서 AI가 핵심 구간 자동 선정
2. **세로형 숏츠 생성**: 720x1280 비율의 숏폼 콘텐츠 자동 생성
3. **다국어 자막**: STT 기반 자막 자동 생성

### 데이터 흐름
```
1. Backend → AI: POST /shorts/process (영상 경로 + 댓글 데이터)
2. AI → Backend: 즉시 응답 { status: "accepted" }
3. AI 서버: STT + 하이라이트 분석 + 숏츠 생성 (비동기)
4. AI → Backend: POST /api/callback/ai-result (완료 결과)
5. Backend: DB 업데이트 + 사용자 알림
```

---

## 2. API 명세

### 2.1 숏츠 생성 요청 (클라이언트 → Backend)

```
POST /api/shorts

Headers:
  X-User-Id: {userId}

Request:
{
  "recordingId": 123,
  "needSubtitles": true,
  "subtitleLang": "ko"  // ko, en, ja, zh
}

Response (202 Accepted):
{
  "jobId": "job_20260131_120000_123",
  "recordingId": 123,
  "studioId": 1,
  "status": "PROCESSING",
  "createdAt": "2026-01-31T12:00:00"
}
```

### 2.2 작업 상태 조회

```
GET /api/shorts/{jobId}

Response:
{
  "jobId": "job_20260131_120000_123",
  "recordingId": 123,
  "status": "COMPLETED",  // PENDING, PROCESSING, COMPLETED, FAILED
  "outputUrl": "http://.../shorts/output.mp4",
  "durationSec": 95.5,
  "highlightStartSec": 120.0,
  "highlightEndSec": 215.5,
  "highlightReason": "댓글 반응이 가장 높은 구간 + 음성 키워드 분석",
  "titles": ["제목1", "제목2", "제목3"],
  "createdAt": "2026-01-31T12:00:00",
  "completedAt": "2026-01-31T12:05:00"
}
```

### 2.3 AI 콜백 (AI → Backend)

```
POST /api/callback/ai-result

Request:
{
  "job_id": "job_20260131_120000_123",
  "video_id": "123",
  "status": "success",  // or "failed"
  "data": {
    "short": {
      "file_path": "/mnt/share/output/shorts/output.mp4",
      "duration_sec": 95.5,
      "has_subtitles": true
    },
    "highlight": {
      "start_sec": 120.0,
      "end_sec": 215.5,
      "reason": "댓글 반응 피크 구간"
    },
    "titles": ["제목1", "제목2", "제목3"]
  }
}

Response:
{
  "status": "received",
  "jobId": "job_20260131_120000_123"
}
```

---

## 3. 아키텍처

### 3.1 패키지 구조

```
shorts/
├── entity/
│   ├── ShortsJob.java       # 작업 엔티티
│   └── ShortsStatus.java    # 상태 enum
├── repository/
│   └── ShortsJobRepository.java
├── dto/
│   ├── ShortsCreateRequest.java   # 클라이언트 요청
│   ├── AiShortsRequest.java       # AI 서버 요청
│   ├── AiCallbackRequest.java     # AI 콜백
│   └── ShortsResponse.java        # 응답
├── client/
│   └── AiServiceClient.java       # AI 서버 HTTP 클라이언트
├── controller/
│   ├── ShortsController.java      # 숏츠 API
│   └── AiCallbackController.java  # 콜백 수신
└── service/
    └── ShortsService.java         # 비즈니스 로직
```

### 3.2 상태 흐름

```
PENDING → PROCESSING → COMPLETED
                    ↘ FAILED
```

| 상태 | 설명 |
|------|------|
| PENDING | 작업 생성됨, AI 요청 전 |
| PROCESSING | AI 서버에서 처리 중 |
| COMPLETED | 숏츠 생성 완료 |
| FAILED | 생성 실패 |

---

## 4. 설계 결정 이유

### 4.1 왜 비동기 처리인가?

```java
// 숏츠 생성은 수 분 소요 → 동기 처리 불가능
POST /api/shorts → 202 Accepted (즉시 반환)
                   ↓
              AI 서버 처리 (3-5분)
                   ↓
POST /api/callback/ai-result (완료 시)
```

| 대안 | 장점 | 단점 |
|------|------|------|
| **비동기 + 콜백 (선택)** | 서버 리소스 효율적, 긴 작업 가능 | 상태 관리 복잡 |
| 동기 처리 | 구현 간단 | 타임아웃, 커넥션 점유 |
| 폴링 | 콜백 없이 가능 | 불필요한 요청, 실시간성 낮음 |

### 4.2 왜 댓글 데이터를 함께 전송하는가?

```java
AiShortsRequest.builder()
    .commentCountsPerMinute(commentCounts)  // [12, 25, 45, 30, ...]
    .build();
```

- STT만으로는 "재미있는" 구간 판단 어려움
- 댓글 반응 = 시청자 관심 지표
- 댓글 피크 + 음성 분석 조합 → 더 정확한 하이라이트

### 4.3 왜 작업 ID에 타임스탬프를 포함하는가?

```java
String jobId = String.format("job_%s_%d", timestamp, recordingId);
// 예: job_20260131_120000_123
```

- 유니크성 보장
- 디버깅 시 생성 시점 확인 용이
- AI 서버 로그와 매칭 가능

### 4.4 왜 중복 작업을 차단하는가?

```java
if (shortsJobRepository.existsByRecordingIdAndStatusIn(
        recordingId,
        List.of(ShortsStatus.PENDING, ShortsStatus.PROCESSING))) {
    throw new BusinessException(ErrorCode.SHORTS_ALREADY_IN_PROGRESS);
}
```

- AI 서버 리소스 낭비 방지
- 동일 영상 중복 처리 방지
- 완료/실패 후 재시도는 허용

---

## 5. 설정

### application.yml

```yaml
ai:
  service:
    url: ${AI_SERVICE_URL:http://localhost:8000}
    api-key: ${AI_API_KEY:}
    webhook-url: ${AI_WEBHOOK_URL:http://localhost:8082/api/callback/ai-result}
    output-dir: ${AI_OUTPUT_DIR:/mnt/share/output/shorts}
```

### 환경변수

```bash
AI_SERVICE_URL=http://ai-server:8000
AI_API_KEY=your-api-key
AI_WEBHOOK_URL=http://media-service:8082/api/callback/ai-result
AI_OUTPUT_DIR=/mnt/share/output/shorts
```

---

## 6. 파일 목록

| 파일 | 설명 |
|------|------|
| `shorts/entity/ShortsJob.java` | 작업 엔티티 |
| `shorts/entity/ShortsStatus.java` | 상태 enum |
| `shorts/repository/ShortsJobRepository.java` | Repository |
| `shorts/dto/ShortsCreateRequest.java` | 클라이언트 요청 DTO |
| `shorts/dto/AiShortsRequest.java` | AI 서버 요청 DTO |
| `shorts/dto/AiCallbackRequest.java` | AI 콜백 DTO |
| `shorts/dto/ShortsResponse.java` | 응답 DTO |
| `shorts/client/AiServiceClient.java` | AI 서버 클라이언트 |
| `shorts/service/ShortsService.java` | 비즈니스 로직 |
| `shorts/controller/ShortsController.java` | 숏츠 API |
| `shorts/controller/AiCallbackController.java` | 콜백 API |

---

## 7. 연동 포인트

### 7.1 분당 댓글 수 연동

```java
// ShortsService.java
List<Integer> commentCounts = commentStatsRepository
    .findByRecordingId(recordingId)
    .map(stats -> parseCountsJson(stats.getCountsJson()))
    .orElse(List.of());
```

`CommentStats`에서 분당 댓글 수를 가져와 AI 요청에 포함

### 7.2 녹화 정보 연동

```java
RecordingSession recording = recordingSessionRepository
    .findById(request.getRecordingId())
    .orElseThrow(...);

// 영상 경로 전달
.videoPath(recording.getFilePath())
```

---

## 8. 테스트 시나리오

### 8.1 성공 케이스

1. `POST /api/shorts` - 202 응답 확인
2. AI 서버 처리
3. `POST /api/callback/ai-result` - 콜백 수신
4. `GET /api/shorts/{jobId}` - COMPLETED 상태 확인

### 8.2 실패 케이스

1. 존재하지 않는 recordingId → 404
2. 이미 진행 중인 작업 → 409 (SHORTS_ALREADY_IN_PROGRESS)
3. AI 서버 오류 → FAILED 상태
