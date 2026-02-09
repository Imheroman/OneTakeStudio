# 방송 송출 기능 오류 및 해결책 정리

## 개요

| 항목 | 내용 |
|------|------|
| 작성일 | 2025-01-26 |
| 기능 | 방송 송출 (RTMP Streaming) |
| 서비스 | media-service, core-service |
| SDK | LiveKit Server SDK 0.8.1 |

---

## 오류 요약

| # | 오류 | 원인 | 상태 |
|---|------|------|------|
| 1 | stopEgress() 타입 불일치 | SDK API 시그니처 차이 | ✅ |
| 2 | listEgress() 타입 불일치 | SDK API 시그니처 차이 | ✅ |
| 3 | startRoomCompositeEgress() 불일치 | SDK API 시그니처 차이 | ✅ |
| 4 | .get() 메서드 오류 | retrofit2.Call 반환 | ✅ |
| 5 | 401 Unauthorized | 내부 API 인증 필요 | ✅ |
| 6 | Feign 타임아웃 | 설정 누락 | ✅ |
| 7 | Feign 에러 처리 | 디코더 누락 | ✅ |
| 8 | streamKey 누락 | DTO 필드 누락 | ✅ |
| 9 | 스트림 세션을 찾을 수 없습니다 (S001) | Go Live 전에 활성 스트림 세션 필요 | ✅ 플로우 구현 완료 |
| 10 | LiveKit 서버 연결 불가 (ERR_CONNECTION_REFUSED) | localhost:7880 에 LiveKit 서버 미실행 | ⚠️ 서버 실행 필요 |
| 11 | LiveKit secret is too short (최소 32자) | livekit.yaml / media-service 등 secret 6자 사용 | ✅ 32자 이상으로 수정 완료 |
| 12 | LiveKit 포트 사용 불가 (UDP 50093 등) | 기존 컨테이너 또는 다른 프로세스가 50000–50100 사용 | ⚠️ 아래 절차 참고 |
| 13 | stream/join 500 (Internal Server Error) | LiveKit 토큰 생성 실패(S004) 또는 미디어 상태 초기화 등 | ⚠️ 아래 절차 참고 |
| 14 | Duplicate entry 'studio-X' for key stream_sessions (joinStream) | room_name 유니크 제약으로 같은 스튜디오 재진입 시 중복 삽입 | ✅ 세션 재사용 로직 적용 |
| 15 | Duplicate entry '1-1-\x01' / '1-1-\x00' for key session_media_states | (studio_id, user_id, is_active) 유니크 → insert/update 시 (1,1,true) 또는 (1,1,false) 중복 | ✅ 기존 활성 행 삭제(delete) 방식으로 변경 |
| 16 | YouTube "connection closed remotely" / 스트림 키 잘못됨 (egress 503) | 유튜브가 RTMP 연결을 끊음. 스트림 키·URL 형식·유튜브 스튜디오 상태 등 | ⚠️ 아래 절차 참고 |

---

## 오류 16: YouTube "connection closed remotely" / 스트림 키 잘못됨 (egress 503)

### 오류 메시지 (egress 로그)
```
egress_failed  {"outputType": "stream", "error": "Failed to connect: 'publish' cmd failed: connection closed remotely", "code": 503, "details": "End reason: Failure"}
```

유튜브 화면에는 "스트림 키가 잘못되었습니다" 등으로 보일 수 있습니다.

### 원인
유튜브 서버가 RTMP 푸시 연결을 **원격에서 끊은** 경우입니다. 스트림 키가 틀린 경우뿐 아니라 아래 상황에서도 같은 오류가 납니다.

1. **스트림 키 앞뒤 공백/줄바꿈**  
   복사 시 공백이나 줄바꿈이 붙으면 유튜브가 키를 틀린 것으로 처리합니다.
2. **유튜브 스튜디오에서 “라이브 준비”가 안 된 상태**  
   스트림 키를 발급받은 뒤, **유튜브 스튜디오 → 라이브 → “라이브 스트리밍”에서 해당 스트림이 “스트리밍할 준비가 되었습니다” 상태**여야 합니다. “만들기”만 하고 준비 완료 전에 송출하면 연결이 끊길 수 있습니다.
3. **스트림 키 재발급**  
   유튜브에서 스트림 키를 다시 만들면 이전 키는 무효입니다. 채널에 저장된 키가 최신인지 확인해야 합니다.
4. **RTMP URL 형식**  
   - URL: `rtmp://a.rtmp.youtube.com/live2` (또는 `rtmp://b.rtmp.youtube.com/live2`)  
   - 스트림 키: **키만** 입력 (URL에 키를 포함하지 말 것).  
   최종 전송 주소는 `rtmp://a.rtmp.youtube.com/live2/여기에스트림키` 형태가 되어야 합니다.
5. **방화벽/네트워크**  
   egress가 동작하는 서버(예: Docker 호스트)에서 유튜브 RTMP(1935 등)로 아웃바운드가 막혀 있으면 연결이 실패하거나 끊깁니다.

### 해결

1. **스트림 키·URL 정리**  
   - 스트림 키: 앞뒤 공백·줄바꿈 제거 후 **키만** 다시 입력해 저장.  
   - RTMP URL: `rtmp://a.rtmp.youtube.com/live2` (끝에 `/` 또는 스트림 키 없이).
2. **유튜브 스튜디오 확인**  
   해당 스트림이 “스트리밍할 준비가 되었습니다” 상태인지 확인한 뒤 다시 송출.
3. **키 재발급 시**  
   유튜브에서 새 스트림 키를 만들었다면, 채널(연결 대상) 설정에서 스트림 키를 새 값으로 갱신.
4. **media-service**  
   스트림 키/URL 사용 시 `trim()` 적용되어 있으므로, 재배포 후 위 1번대로만 저장하면 공백 문제는 줄어듭니다.
5. **서버에서 유튜브 연결 테스트**  
   egress가 돌아가는 서버에서 `telnet a.rtmp.youtube.com 1935` 등으로 1935 포트 아웃바운드 가능 여부 확인.

---

## 오류 15: session_media_states 중복 키 (Duplicate entry '1-1-\x01' / '1-1-\x00')

### 오류 메시지 (media-service 로그)
- **INSERT 시**: `Duplicate entry '1-1-\x01'` (is_active=true 중복)
- **UPDATE 시**: `Duplicate entry '1-1-\x00'` (is_active=false 중복)  
  `update session_media_states set ... is_active=? ... where id=?`

### 원인
`session_media_states` 테이블에 **(studio_id, user_id, is_active)** 유니크 제약이 있어, (1, 1, true) 행도 하나, (1, 1, false) 행도 **각각 하나만** 허용됩니다.

1. **INSERT 중복**: 기존 활성 행을 비활성화하지 않고 새 행을 insert 하면 (1,1,true) 중복.
2. **UPDATE 중복**: 기존 활성 행을 `is_active=false` 로 **업데이트**하면, 이미 다른 행이 (1,1,false) 로 존재할 때 유니크 위반이 납니다. (여러 번 join/leave 하면 (1,1,false) 행이 이미 있는 상태에서 또 false 로 바꾸려 해서 발생.)

### 해결 (적용 완료)
- **MediaSettingsService.initializeSessionState**: 기존 활성 상태를 **비활성화(update)하지 않고 삭제(delete)** 한 뒤, 새 `SessionMediaState` 를 생성·저장하도록 변경했습니다.
- **MediaSettingsService.terminateSessionState**: 퇴장 시에도 기존 활성 행을 **삭제(delete)** 하도록 변경했습니다.
- 이렇게 하면 (studio_id, user_id, is_active) 조합이 한 번에 하나의 행만 유지되어 유니크 위반이 발생하지 않습니다. (과거 세션 이력은 남기지 않고 현재 활성만 유지하는 방식입니다.)

---

## 오류 14: stream_sessions 중복 키 (Duplicate entry 'studio-X')

### 오류 메시지 (media-service 로그)
```
Duplicate entry 'studio-1' for key 'stream_sessions.UKk33hmuy33mflpgoucdj1nutlo'
DataIntegrityViolationException: could not execute statement ...
```

### 원인
`stream_sessions` 테이블에 **room_name** 유니크 제약이 있어, 한 스튜디오당 하나의 행만 허용됩니다.  
이전 Go Live/스트림 참여 후 정상적으로 퇴장(leave)하지 않았거나, 같은 스튜디오로 다시 join 할 때 **새 행을 insert** 하면 위 제약에 걸립니다.

### 해결 (적용 완료)
- **StreamService.joinStream**: 같은 `room_name` 에 이미 행이 있으면 **새로 insert 하지 않고** 해당 행을 **재사용**하도록 변경했습니다.  
  - 기존 행의 `userId`, `participantIdentity`, `metadata` 를 갱신하고 `status` 를 `CONNECTING` 으로 두어, 토큰만 새로 발급해 반환합니다.
- **StreamSession.reuseForNewParticipant**: 세션 재사용 시 필드 갱신용 메서드를 추가했습니다.
- **GlobalExceptionHandler**: `DataIntegrityViolationException` (중복 키) 발생 시 409 + S002 메시지로 응답하도록 했습니다.

같은 스튜디오로 여러 번 Go Live를 시도해도 중복 키 500 이 나지 않아야 합니다.

---

## 오류 13: stream/join 500 (Go Live 시 500 에러)

### 오류 메시지 (프론트/콘솔)
```
POST http://localhost:60000/api/v1/media/stream/join 500 (Internal Server Error)
AxiosError: Request failed with status code 500
```

Go Live 확인 시 **스트림 참여(토큰 발급)** API `POST /api/v1/media/stream/join` 호출에서 500 이 발생합니다.

### 원인
백엔드(media-service)에서 다음 중 하나가 실패할 수 있습니다.

1. **LiveKit 토큰 생성 실패 (S004)**  
   - `livekit.api.key` / `livekit.api.secret` 이 livekit.yaml 과 다르거나, secret 이 32자 미만인 경우  
   - media-service 재시작 없이 secret 만 변경한 경우  
2. **X-User-Id 미전달**  
   - 게이트웨이가 JWT 에서 `iid` claim 을 읽어 `X-User-Id` 로 넘깁니다. 로그인 토큰에 `iid` 가 없으면 400 이 나올 수 있으며, 값이 비정상이면 500 으로 이어질 수 있습니다.  
3. **미디어 상태 초기화 등 DB/내부 로직**  
   - DB 연결, 스키마, 트랜잭션 등에서 예외가 나면 500 이 반환됩니다.

### 해결

1. **media-service 로그 확인**  
   - `Failed to generate LiveKit token` 또는 `LIVEKIT_TOKEN_GENERATION_FAILED` 가 보이면 LiveKit 설정 문제입니다.  
   - 응답 body 의 `code` 가 `S004` 이면 동일합니다.

2. **LiveKit 설정 통일**  
   - `media-service/src/main/resources/application.yml` 의 `livekit.api.key`, `livekit.api.secret` 이 `livekit.yaml` 의 `keys.devkey` 값과 **완전히 동일**한지 확인합니다.  
   - secret 은 **32자 이상**이어야 합니다. (오류 11 참고)  
   - 설정 변경 후 **media-service 를 재시작**합니다.

3. **로그인 JWT 에 iid 포함 여부**  
   - core-service 가 발급하는 JWT 에 내부 사용자 ID(`iid` claim)가 포함되는지 확인합니다.  
   - 없으면 게이트웨이에서 `X-User-Id` 가 설정되지 않아 stream/join 이 실패할 수 있습니다.

4. **일반 500 인 경우**  
   - media-service 로그에서 스택 트레이스를 확인하고, DB 연결, `media_settings` / `session_media_state` 테이블 존재 여부 등을 점검합니다.

---

## 오류 12: LiveKit UDP 포트 사용 불가 (ports are not available)

### 오류 메시지 (Docker)
```
Error response from daemon: ports are not available: exposing port UDP 0.0.0.0:50093 -> ...
bind: Only one usage of each socket address (protocol/network address/port) is normally permitted.
```

### 원인
LiveKit 은 WebRTC 용으로 **UDP 50000–50100** 구간을 사용합니다. 다음 경우에 포트가 이미 사용 중이 됩니다.

- 이전에 띄운 LiveKit 컨테이너가 아직 떠 있거나, 종료 후에도 포트가 해제되지 않은 경우
- 다른 앱(게임, 화상회의, 다른 LiveKit 인스턴스 등)이 같은 UDP 포트를 쓰는 경우  
- Windows 에서 Docker UDP 포트 매핑이 겹치는 경우

### 해결

**1단계: 기존 LiveKit 컨테이너 정리 후 재시작**

```bash
# LiveKit만 중지
docker-compose stop livekit

# (선택) 중지된 컨테이너까지 제거 후 다시 생성
docker-compose rm -f livekit

# Redis + LiveKit 다시 기동
docker-compose up -d redis livekit
```

**2단계: 그래도 실패하면 포트 범위 변경 (프로젝트 기본값 반영됨)**

이 프로젝트는 Windows 등에서 50000–50100 구간 충돌을 피하기 위해 **기본 UDP 포트를 50200–50250** 으로 설정해 두었습니다.

- `livekit.yaml`: `port_range_start: 50200`, `port_range_end: 50250`
- `docker-compose.yml` livekit 서비스: `"50200-50250:50200-50250/udp"`

다른 구간이 필요하면 위 두 파일에서 동일한 범위로 맞춰 변경한 뒤:

```bash
docker-compose up -d redis livekit
```

**3단계: 포트가 여전히 안 풀리면**

- Docker Desktop 재시작, 또는
- PC 재부팅 후 위 1단계부터 다시 시도

---

## 오류 11: LiveKit secret is too short

### 오류 메시지 (LiveKit 서버 로그)
```
ERROR livekit config/config.go:613   secret is too short, should be at least 32 characters for security     {"apiKey": "devkey"}
```

### 원인
LiveKit Server 1.9+ 부터 API secret 은 **최소 32자**가 필요합니다. 개발용으로 `secret`(6자)을 쓰면 위 검증에서 실패합니다.

### 해결 (적용 완료)
다음 파일에서 **동일한 32자 이상 secret** 을 사용하도록 수정했습니다.

| 파일 | 설정 |
|------|------|
| `livekit.yaml` | `keys.devkey` |
| `media-service/.../application.yml` | `livekit.api.secret` |
| `egress.yaml` | `api_secret` |
| `ingress.yaml` | `api_secret` |

예: `devkey-secret-for-livekit-min-32-chars` (36자).  
**Secret 변경 후 LiveKit Docker 컨테이너를 재시작**해야 합니다.

```bash
docker-compose up -d redis livekit
# 또는
docker-compose restart livekit
```

---

## 오류 10: LiveKit 서버 연결 불가 (ERR_CONNECTION_REFUSED)

### 오류 메시지
```
WebSocket connection to 'ws://localhost:7880/rtc/v1?...' failed
GET http://localhost:7880/rtc/v1... net::ERR_CONNECTION_REFUSED
Go Live 실패: ConnectionError: could not establish signal connection: Failed to fetch
```

### 원인
Go Live 시 프론트엔드는 **LiveKit 서버**(시그널/WebRTC용)에 직접 연결합니다. media-service 는 토큰만 발급하고, 실제 룸 연결은 **LiveKit 서버**(포트 7880)로 가기 때문에, 해당 서버가 떠 있지 않으면 `ERR_CONNECTION_REFUSED` 가 발생합니다.

### 해결
**LiveKit 서버를 실행**합니다. 프로젝트에는 `docker-compose.yml` 에 LiveKit 서비스가 정의되어 있습니다.

```bash
# LiveKit 서버만 실행 (Redis 의존)
docker-compose up -d redis livekit

# 필요 시 Egress(녹화/송출)도 함께 실행
docker-compose up -d redis livekit livekit-egress
```

실행 후 `http://localhost:7880` 이 응답하는지 확인한 뒤, 다시 Go Live 를 시도합니다.  
프론트엔드에서는 위와 같은 연결 실패 시 "LiveKit 서버에 연결할 수 없습니다. (예: docker-compose up livekit)" 안내가 표시되도록 되어 있습니다.

---

## 오류 9: 스트림 세션을 찾을 수 없습니다 (S001)

### 오류 메시지
```
BusinessException: 스트림 세션을 찾을 수 없습니다
ErrorCode: STREAM_SESSION_NOT_FOUND (S001), HTTP 404
```

### 원인
**Go Live(송출 시작)** 는 **활성 스트림 세션(StreamSession, status=ACTIVE)** 이 있어야 동작합니다.

- Media 서비스 `PublishService.startPublish()` 는 `stream_sessions` 테이블에서 `studio_id` + `status=ACTIVE` 인 세션을 조회합니다.
- 해당 세션은 **프론트엔드에서 `POST /api/v1/media/stream/join` 호출 후 LiveKit 룸에 실제로 연결**되어 있어야 백엔드에서 ACTIVE 로 전환됩니다.
- 현재 프론트엔드는 스튜디오 진입 시 stream/join 을 호출하지 않으며, LiveKit 클라이언트 연동도 없어 활성 스트림 세션이 생성되지 않습니다.

### 필요한 플로우 (향후 구현)
1. **스튜디오 진입 또는 “스트림 준비” 시**: `POST /api/v1/media/stream/join` (body: `{ studioId }`) 호출 → 토큰 수신.
2. **LiveKit 연결**: 수신한 토큰으로 LiveKit 룸 접속, 캔버스/웹캠 스트림 퍼블리시.
3. **백엔드**: 참가자 연결 시 webhook 등으로 `activateSession(roomName, participantIdentity)` 호출 → StreamSession 이 ACTIVE 로 변경.
4. **Go Live 클릭**: 이제 `POST /api/v1/media/publish` 시 활성 스트림 세션이 있으므로 송출 시작 가능.

### 구현 완료 (2026-01-30)
- **프론트엔드**: 에러 코드 `S001` 또는 메시지에 “스트림 세션” 포함 시, 사용자에게  
  `"Go Live를 사용하려면 먼저 스트림에 연결해 주세요. (스트림 연결 기능은 준비 중입니다.)"` 로 안내.
- **백엔드**: `participant_joined` 웹훅 수신 시 `StreamService.activateSession(roomName, participantIdentity)` 호출로 스트림 세션을 ACTIVE 로 전환.
- **프론트엔드**: Go Live 확인 시 1) 프리뷰 스트림 조회 → 2) stream/join 토큰 발급 → 3) LiveKit 룸 연결 및 비디오/오디오 퍼블리시 → 4) 웹훅 ACTIVE 대기(1.5초) → 5) startPublish 송출 시작. 스튜디오 퇴장/언마운트 시 LiveKit disconnect 및 leaveStream 호출.
- **게이트웨이**: `/api/v1/media/**` → `/api/media/**` 로 RewritePath 적용하여 stream/join 등 Media API 경로 일치 확인.

---

## 오류 1: stopEgress() 파라미터 타입 불일치

### 오류 메시지
```
'stopEgress(java.lang.String)' cannot be applied to '(LivekitEgress.StopEgressRequest)'
```

### 원인
LiveKit SDK 0.8.1의 `stopEgress()`는 Request 객체가 아닌 **String을 직접** 받음

### 해결
```java
// Before
LivekitEgress.StopEgressRequest stopRequest = LivekitEgress.StopEgressRequest.newBuilder()
        .setEgressId(egressId)
        .build();
egressServiceClient.stopEgress(stopRequest).get();

// After
egressServiceClient.stopEgress(egressId).execute();
```

---

## 오류 2: listEgress() 파라미터 타입 불일치

### 오류 메시지
```
'listEgress(java.lang.String)' cannot be applied to '(LivekitEgress.ListEgressRequest)'
```

### 원인
`listEgress()`도 Request 객체가 아닌 **String roomName**을 받음

### 해결
```java
// Before
LivekitEgress.ListEgressRequest request = LivekitEgress.ListEgressRequest.newBuilder()
        .setEgressId(egressId)
        .build();
List<LivekitEgress.EgressInfo> egressList = egressServiceClient.listEgress(request).get();

// After - null로 전체 조회 후 필터링
retrofit2.Response<List<LivekitEgress.EgressInfo>> response =
        egressServiceClient.listEgress(null).execute();
List<LivekitEgress.EgressInfo> egressList = response.body();

return egressList.stream()
        .filter(info -> info.getEgressId().equals(egressId))
        .findFirst()
        .orElseThrow(() -> new RuntimeException("Egress not found"));
```

---

## 오류 3: startRoomCompositeEgress() 메서드 시그니처 불일치

### 오류 메시지
```
Cannot resolve method 'startRoomCompositeEgress(RoomCompositeEgressRequest)'
```

### 원인
SDK 0.8.1에서는 Request 객체 대신 **개별 파라미터**를 받음
- 시그니처: `startRoomCompositeEgress(String roomName, Output output)`

### 해결
```java
// Before
LivekitEgress.RoomCompositeEgressRequest request = LivekitEgress.RoomCompositeEgressRequest.newBuilder()
        .setRoomName(roomName)
        .setFile(fileOutput)
        .setLayout("speaker")
        .build();
LivekitEgress.EgressInfo egressInfo = egressServiceClient.startRoomCompositeEgress(request).get();

// After
retrofit2.Response<LivekitEgress.EgressInfo> response = egressServiceClient
        .startRoomCompositeEgress(roomName, fileOutput)
        .execute();
LivekitEgress.EgressInfo egressInfo = response.body();
```

---

## 오류 4: .get() 메서드 호출 오류

### 오류 메시지
```
Cannot resolve method 'get' in 'Call'
```

### 원인
SDK가 `CompletableFuture`가 아닌 **retrofit2.Call**을 반환

### 해결
```java
// Before (CompletableFuture 방식)
egressServiceClient.stopEgress(egressId).get();

// After (retrofit2.Call 방식)
egressServiceClient.stopEgress(egressId).execute();
```

---

## 오류 5: 401 Unauthorized (인증 문제)

### 오류 메시지
```
feign.FeignException$Unauthorized: [401] during [POST] to
[http://localhost:8081/api/destinations/internal/batch]
```

### 원인
core-service의 SecurityConfig에서 모든 요청에 인증 요구

### 해결
**core-service/SecurityConfig.java** 수정:
```java
// Before
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**", "/actuator/health").permitAll()
    .anyRequest().authenticated()
)

// After - 내부 API 허용 추가
.authorizeHttpRequests(auth -> auth
    .requestMatchers(
        "/api/auth/**",
        "/api/**/internal/**",  // 추가
        "/actuator/health"
    ).permitAll()
    .anyRequest().authenticated()
)
```

---

## 오류 6: Feign 타임아웃 설정 누락

### 오류 메시지 (잠재적)
```
feign.RetryableException: Read timed out
```

### 원인
Feign 기본 타임아웃이 짧아 네트워크 지연 시 실패

### 해결
**media-service/application.yml** 수정:
```yaml
feign:
  client:
    config:
      default:
        connectTimeout: 5000
        readTimeout: 10000
        loggerLevel: BASIC
    core-service:
      url: ${CORE_SERVICE_URL:http://localhost:8081}
```

---

## 오류 7: Feign 에러 디코더 누락

### 오류 메시지 (잠재적)
```
feign.FeignException: status 500 reading CoreServiceClient#getDestinationsByIds
```

### 원인
적절한 예외 변환 없이 HTTP 상태 코드만 반환

### 해결
**FeignErrorDecoder.java** 신규 생성:
```java
@Slf4j
public class FeignErrorDecoder implements ErrorDecoder {
    @Override
    public Exception decode(String methodKey, Response response) {
        log.error("Feign error: methodKey={}, status={}", methodKey, response.status());

        return switch (response.status()) {
            case 400 -> new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
            case 404 -> new BusinessException(ErrorCode.DESTINATION_NOT_FOUND);
            case 500, 502, 503 -> new BusinessException(ErrorCode.DESTINATION_FETCH_FAILED);
            default -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        };
    }
}
```

**FeignConfig.java** 신규 생성:
```java
@Configuration
public class FeignConfig {
    @Bean
    public ErrorDecoder errorDecoder() {
        return new FeignErrorDecoder();
    }
}
```

---

## 오류 8: DestinationResponse에 streamKey 필드 누락

### 오류 (잠재적)
송출 시 streamKey가 null이 되어 RTMP 연결 실패

### 원인
Entity에는 있지만 DTO 변환 시 필드 누락

### 해결
**core-service/DestinationResponse.java** 수정:
```java
@Getter
@Builder
public class DestinationResponse {
    private Long id;              // 추가
    private String destinationId;
    private String platform;
    private String channelId;
    private String channelName;
    private String rtmpUrl;
    private String streamKey;     // 추가
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static DestinationResponse from(ConnectedDestination entity) {
        return DestinationResponse.builder()
                .id(entity.getId())
                .destinationId(entity.getDestinationId())
                .platform(entity.getPlatform())
                .channelId(entity.getChannelId())
                .channelName(entity.getChannelName())
                .rtmpUrl(entity.getRtmpUrl())
                .streamKey(entity.getStreamKey())  // 추가
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
```

---

## 수정된 파일 목록

### media-service

| 파일 | 변경 |
|------|------|
| `pom.xml` | OpenFeign 의존성 추가 |
| `application.yml` | Feign 설정 추가 |
| `MediaServiceApplication.java` | @EnableFeignClients 추가 |
| `LiveKitEgressService.java` | SDK API 호출 방식 수정 |
| `PublishService.java` | Feign Client 연동 |
| `ErrorCode.java` | 에러 코드 추가 |
| `CoreServiceClient.java` | **신규** |
| `DestinationDto.java` | **신규** |
| `CoreApiResponse.java` | **신규** |
| `FeignErrorDecoder.java` | **신규** |
| `FeignConfig.java` | **신규** |

### core-service

| 파일 | 변경 |
|------|------|
| `SecurityConfig.java` | internal API 허용 |
| `DestinationResponse.java` | id, streamKey 필드 추가 |
| `DestinationService.java` | batch 조회 메서드 추가 |
| `DestinationController.java` | internal API 추가 |
| `ConnectedDestinationRepository.java` | findByIdIn 메서드 추가 |

---

## 핵심 교훈

| 교훈 | 설명 |
|------|------|
| **SDK 버전 확인** | pom.xml에서 버전 확인 후 해당 버전 API 문서 참조 |
| **반환 타입 확인** | CompletableFuture vs retrofit2.Call 구분 |
| **IDE 진단 활용** | 오류 메시지에서 예상 타입과 실제 타입 비교 |
| **내부 API 보안** | 서비스 간 통신용 API는 인증 예외 처리 |
| **DTO 검증** | Entity → DTO 변환 시 필요 필드 모두 포함 |