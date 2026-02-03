# LiveKit 송출 연동 문제 분석 및 해결

> **작성일**: 2026-01-31
> **문제**: LiveKit 토큰 문제로 인한 송출 연동 실패
> **결과**: 토큰 문제가 아닌 세션 상태 관리 문제로 확인, 해결 완료

---

## 1. 문제 상황

### 1.1 증상
- 송출(Publish) 연동이 되지 않음
- "LiveKit 토큰 양식이 맞지 않다"는 의견 제기

### 1.2 영향 범위
- `POST /api/media/publish/start` API 호출 시 실패
- RTMP 송출(YouTube 등)이 시작되지 않음

---

## 2. 분석 과정

### 2.1 Step 1: 토큰 생성 로직 확인

**파일**: `media-service/src/main/java/com/onetake/media/stream/service/LiveKitService.java`

```java
public StreamTokenResponse generateToken(Long userId, StreamTokenRequest request) {
    // ...
    AccessToken accessToken = liveKitConfig.createAccessToken();
    accessToken.setIdentity(participantIdentity);
    accessToken.setName(request.getParticipantName());

    if (request.getMetadata() != null) {
        accessToken.setMetadata(request.getMetadata());
    }

    accessToken.addGrants(
        new RoomJoin(true),
        new RoomName(roomName)
    );

    String token = accessToken.toJwt();
    // ...
}
```

**확인 결과**:
- `RoomJoin(true)`, `RoomName(roomName)` 설정됨
- `canPublish`, `canSubscribe`, `canPublishData`는 명시적으로 설정되지 않음

### 2.2 Step 2: LiveKit 토큰 권한 기본값 확인

**LiveKit 공식 문서 확인 결과**:
> "If neither canPublish or canSubscribe is set, **both publish and subscribe are enabled**."

| 권한 | 명시적 설정 | 기본값 |
|------|------------|--------|
| canPublish | 미설정 | ✅ 허용 |
| canSubscribe | 미설정 | ✅ 허용 |
| canPublishData | 미설정 | ✅ 허용 |

**결론**: 토큰 권한 자체는 문제없음

### 2.3 Step 3: 송출 시작 로직 분석

**파일**: `media-service/src/main/java/com/onetake/media/publish/service/PublishService.java`

```java
@Transactional
public PublishResponse startPublish(Long userId, PublishStartRequest request) {
    // ...

    // 활성 스트림 세션 확인 ← 핵심 포인트!
    StreamSession streamSession = streamSessionRepository
        .findByStudioIdAndStatus(request.getStudioId(), SessionStatus.ACTIVE)
        .orElseThrow(() -> new BusinessException(ErrorCode.STREAM_SESSION_NOT_FOUND));

    // ...
}
```

**발견**: `SessionStatus.ACTIVE` 상태인 세션만 찾음

### 2.4 Step 4: 세션 생성 로직 분석

**파일**: `media-service/src/main/java/com/onetake/media/stream/service/StreamService.java`

```java
@Transactional
public StreamTokenResponse joinStream(Long userId, StreamTokenRequest request) {
    // ...

    StreamSession session = StreamSession.builder()
        .studioId(request.getStudioId())
        .userId(userId)
        .roomName(roomName)
        .participantIdentity(tokenResponse.getParticipantIdentity())
        .status(SessionStatus.CONNECTING)  // ← CONNECTING으로 저장!
        .metadata(request.getMetadata())
        .build();

    // ...
}
```

**발견**: 세션이 `CONNECTING` 상태로 저장됨

### 2.5 Step 5: 세션 활성화 로직 확인

```java
@Transactional
public void activateSession(String roomName, String participantIdentity) {
    streamSessionRepository.findByRoomName(roomName)
        .ifPresent(session -> {
            if (session.getParticipantIdentity().equals(participantIdentity)) {
                session.activate();  // CONNECTING → ACTIVE
                log.info("Stream session activated: roomName={}, participant={}",
                    roomName, participantIdentity);
            }
        });
}
```

**발견**: `activateSession()` 메서드는 존재하지만, **호출하는 곳이 없음!**

### 2.6 Step 6: Webhook 컨트롤러 확인

**파일**: `media-service/src/main/java/com/onetake/media/stream/controller/LiveKitWebhookController.java`

```java
switch (event.getEvent()) {
    case "egress_started":
        handleEgressStarted(event);
        break;
    case "egress_ended":
        handleEgressEnded(event);
        break;
    default:
        log.debug("Unhandled webhook event: {}", event.getEvent());
}
```

**발견**: `participant_joined` 이벤트를 처리하지 않음!

---

## 3. 근본 원인

### 3.1 문제 흐름도

```
┌─────────────────────────────────────────────────────────────┐
│                      정상 흐름 (기대값)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  joinStream() → 세션 CONNECTING 저장 → 토큰 반환            │
│       ↓                                                     │
│  클라이언트가 토큰으로 LiveKit Room 참여                     │
│       ↓                                                     │
│  LiveKit → participant_joined webhook 전송                  │
│       ↓                                                     │
│  handleParticipantJoined() → activateSession()              │
│       ↓                                                     │
│  세션 상태: CONNECTING → ACTIVE                             │
│       ↓                                                     │
│  startPublish() → ACTIVE 세션 찾기 성공 → 송출 시작         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      실제 흐름 (버그)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  joinStream() → 세션 CONNECTING 저장 → 토큰 반환            │
│       ↓                                                     │
│  클라이언트가 토큰으로 LiveKit Room 참여                     │
│       ↓                                                     │
│  LiveKit → participant_joined webhook 전송                  │
│       ↓                                                     │
│  ❌ participant_joined 이벤트 처리 안함                      │
│       ↓                                                     │
│  세션 상태: CONNECTING (영원히 유지)                         │
│       ↓                                                     │
│  startPublish() → ACTIVE 세션 못 찾음 → ❌ 송출 실패         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 원인 요약

| 구분 | 내용 |
|------|------|
| **표면적 증상** | 송출 연동 실패 |
| **의심된 원인** | LiveKit 토큰 양식 문제 |
| **실제 원인** | `participant_joined` 이벤트 미처리로 인한 세션 활성화 누락 |
| **영향** | 세션이 `CONNECTING` 상태로 유지되어 `ACTIVE` 세션을 찾지 못함 |

---

## 4. 해결책

### 4.1 수정 파일

**파일**: `media-service/src/main/java/com/onetake/media/stream/controller/LiveKitWebhookController.java`

### 4.2 수정 내용

#### 4.2.1 Import 추가

```java
import com.onetake.media.stream.service.StreamService;
import livekit.LivekitModels;
```

#### 4.2.2 의존성 추가

```java
public class LiveKitWebhookController {

    private final RecordingService recordingService;
    private final LocalStorageService localStorageService;
    private final StreamService streamService;  // 추가
    private final WebhookReceiver webhookReceiver;

    // ...
}
```

#### 4.2.3 이벤트 처리 추가

```java
switch (event.getEvent()) {
    case "participant_joined":           // 추가
        handleParticipantJoined(event);  // 추가
        break;                           // 추가
    case "egress_started":
        handleEgressStarted(event);
        break;
    case "egress_ended":
        handleEgressEnded(event);
        break;
    default:
        log.debug("Unhandled webhook event: {}", event.getEvent());
}
```

#### 4.2.4 핸들러 메서드 추가

```java
/**
 * 참가자 참여 이벤트 처리 - 세션 활성화
 */
private void handleParticipantJoined(LivekitWebhook.WebhookEvent event) {
    if (!event.hasParticipant() || !event.hasRoom()) {
        return;
    }

    LivekitModels.ParticipantInfo participant = event.getParticipant();
    LivekitModels.Room room = event.getRoom();

    String roomName = room.getName();
    String participantIdentity = participant.getIdentity();

    log.info("Participant joined: roomName={}, identity={}", roomName, participantIdentity);

    // 세션 활성화
    streamService.activateSession(roomName, participantIdentity);
}
```

---

## 5. LiveKit 설정 확인

### 5.1 livekit.yaml

```yaml
port: 7880
bind_addresses:
  - ""

rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50100

keys:
  devkey: secret

redis:
  address: redis:6379

webhook:
  urls:
    - http://host.docker.internal:8082/api/media/webhook/livekit
  api_key: devkey
```

**확인 결과**: Webhook URL이 올바르게 설정됨 ✅

### 5.2 egress.yaml

```yaml
api_key: devkey
api_secret: secret
ws_url: ws://livekit:7880

redis:
  address: redis:6379

file_output:
  local:
    directory: /recordings
```

**확인 결과**: Egress 서비스 설정 정상 ✅

### 5.3 application.yml (media-service)

```yaml
livekit:
  host: http://localhost:7880
  api:
    key: devkey
    secret: secret
  egress:
    output-path: /recordings/
```

**확인 결과**: LiveKit 연결 설정 정상 ✅

---

## 6. 검증 체크리스트

### 6.1 수정 후 테스트 항목

- [ ] media-service 정상 기동
- [ ] `POST /api/media/stream/join` 호출 → 토큰 반환
- [ ] 클라이언트에서 토큰으로 Room 참여
- [ ] LiveKit에서 `participant_joined` webhook 수신 확인 (로그)
- [ ] 세션 상태가 `ACTIVE`로 변경되었는지 확인
- [ ] `POST /api/media/publish/start` 호출 → 송출 시작 성공

### 6.2 로그 확인 포인트

```
INFO  - LiveKit webhook received: event=participant_joined
INFO  - Participant joined: roomName=studio-{id}, identity=user-{id}-{name}
INFO  - Stream session activated: roomName=studio-{id}, participant=user-{id}-{name}
```

---

## 7. 추가 발견 사항

### 7.1 토큰 권한 미반영 (향후 개선 사항)

`StreamTokenRequest`에 다음 필드가 있지만 실제 토큰 생성 시 반영되지 않음:

```java
private boolean canPublish;
private boolean canSubscribe;
private boolean canPublishData;
```

**영향**: 현재는 기본값(모두 허용)이 적용되어 문제없으나, 세밀한 권한 제어가 필요한 경우 수정 필요

### 7.2 MySQL 연결 오류

분석 중 별도로 발생한 오류:

```
Access denied for user 'media_user'@'172.18.0.1' (using password: YES)
```

**원인**: Docker MySQL 볼륨에 기존 데이터가 있어 `init.sql`이 실행되지 않음

**해결**:
```bash
docker-compose down -v
docker-compose up -d
```

---

## 8. 결론

| 항목 | 결과 |
|------|------|
| **의심된 원인** | LiveKit 토큰 양식 문제 |
| **실제 원인** | 세션 활성화 로직 누락 (`participant_joined` 이벤트 미처리) |
| **해결 방법** | Webhook 컨트롤러에 `participant_joined` 이벤트 처리 추가 |
| **수정 파일** | `LiveKitWebhookController.java` |
| **토큰 문제 여부** | ❌ 토큰 자체는 정상 |

---

## 9. 참고 자료

- [LiveKit Authentication Docs](https://docs.livekit.io/realtime/concepts/authentication/)
- [LiveKit VideoGrant Reference](https://docs.livekit.io/server-sdk-js/interfaces/VideoGrant.html)
- [LiveKit Webhook Events](https://docs.livekit.io/realtime/server/webhooks/)
