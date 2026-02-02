# 2026-01-31 작업 내역

## 개요
RTMP 송출 기능 개선 및 안정화 작업

---

## 변경된 파일

### 1. API Gateway - application.yml
**경로:** `api-gateway/src/main/resources/application.yml`

**변경 내용:**
- `/api/publish/**` 라우트 추가 → `/api/media/publish`로 리라이트
- CORS 오류 해결 (프론트엔드 → API Gateway 라우팅 문제)

---

### 2. Media Service - ErrorCode.java
**경로:** `media-service/src/main/java/com/onetake/media/global/exception/ErrorCode.java`

**변경 내용:**
- `LIVEKIT_ROOM_NOT_FOUND` 에러 코드 추가
- LiveKit room이 존재하지 않을 때 명확한 에러 메시지 제공

---

### 3. Media Service - PublishService.java
**경로:** `media-service/src/main/java/com/onetake/media/publish/service/PublishService.java`

**변경 내용:**
- **Room 존재 확인 로직 추가**: RTMP 송출 전 LiveKit room 참가자 확인
- **사용자 비디오 품질 설정 적용**: `UserMediaSettings`에서 `VideoQuality` 조회 후 Egress에 적용
- **Egress 종료 이벤트 처리**: `handleEgressEnded()` 메서드 추가
- **비정상 세션 정리**: `cleanupStaleSessions()` 메서드 추가 (1시간 이상 PUBLISHING 상태 세션 강제 종료)
- **Room 비었을 때 처리**: `handleRoomEmpty()` 메서드 추가
- **WebSocket 이벤트 발행**: `PublishEventPublisher` 연동

---

### 4. Media Service - LiveKitWebhookController.java
**경로:** `media-service/src/main/java/com/onetake/media/stream/controller/LiveKitWebhookController.java`

**변경 내용:**
- `participant_left` 이벤트 핸들러 추가 (참가자 퇴장 시 room 비었는지 확인)
- `room_finished` 이벤트 핸들러 추가
- `egress_ended` 이벤트에서 Publish 세션도 처리 (기존: Recording만 처리)
- 에러 메시지 추출 및 전달

---

### 5. Media Service - LiveKitEgressService.java
**경로:** `media-service/src/main/java/com/onetake/media/stream/service/LiveKitEgressService.java`

**변경 내용:**
- `startRtmpStream()` 메서드에 `VideoQuality` 파라미터 추가
- 사용자 설정에 따른 해상도/비트레이트 동적 적용
  - LOW: 854x480, 1Mbps
  - MEDIUM: 1280x720, 2.5Mbps
  - HIGH: 1920x1080, 5Mbps
  - ULTRA: 3840x2160, 15Mbps

---

## 신규 파일

### 1. PublishEventPublisher.java (신규)
**경로:** `media-service/src/main/java/com/onetake/media/publish/event/PublishEventPublisher.java`

**기능:**
- WebSocket(STOMP)을 통한 송출 상태 이벤트 발행
- 이벤트 종류:
  - `PUBLISH_STARTED`: 송출 시작
  - `PUBLISH_STOPPED`: 정상 종료
  - `PUBLISH_FAILED`: 에러 발생
  - `PUBLISH_ENDED_EXTERNALLY`: 외부 종료 (YouTube에서 종료, 참가자 전원 퇴장 등)
- 토픽: `/topic/studio/{studioId}/publish`

---

### 2. PublishSessionCleanupScheduler.java (신규)
**경로:** `media-service/src/main/java/com/onetake/media/publish/scheduler/PublishSessionCleanupScheduler.java`

**기능:**
- 10분마다 실행
- 1시간 이상 PUBLISHING 상태인 비정상 세션 강제 종료
- Egress 중지 시도 후 DB 상태 업데이트

---

## 해결된 이슈

1. **CORS 오류**: `/api/publish` 라우트 누락 → 추가
2. **"requested room does not exist" 오류**: Room 존재 확인 로직 추가
3. **"이미 송출이 진행 중입니다" 오류**: 비정상 세션 정리 스케줄러 추가
4. **Egress 토큰 인증 실패**: LiveKit/Egress 컨테이너 재시작으로 해결
5. **화질 설정 미적용**: VideoQuality 설정 연동

---

## 테스트 결과

- RTMP 송출 성공 확인 (YouTube)
- 딜레이: 약 20-40초 (Room Composite 방식 특성상 정상)
- 720p/1080p 설정 시 딜레이 감소 확인 필요
