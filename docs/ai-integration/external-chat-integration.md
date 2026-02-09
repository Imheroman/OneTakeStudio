# 외부 플랫폼 채팅 연동 구현

> 작성일: 2026-01-31
> 브랜치: be-ai

---

## 1. 구현 목적

### 왜 필요한가?
1. **멀티 플랫폼 동시 송출**: 유튜브, 치지직 등 여러 플랫폼에서 동시에 방송
2. **통합 채팅**: 모든 플랫폼의 채팅을 하나의 화면에서 관리
3. **AI 하이라이트**: 외부 채팅도 분당 카운트에 포함 → 반응 피크 탐지

### 데이터 흐름
```
유튜브/치지직 → ExternalChatClient → ChatIntegrationService
                                            ↓
                                    ChatService.receiveExternalMessage()
                                            ↓
                              DB 저장 + WebSocket 브로드캐스트 + 카운터 증가
```

---

## 2. 아키텍처

### 2.1 클래스 구조

```
ExternalChatClient (인터페이스)
├── YouTubeChatClient   - YouTube Data API v3
├── ChzzkChatClient     - 치지직 WebSocket
└── TwitchChatClient    - Twitch IRC

ChatIntegrationService
├── startIntegration()    - 플랫폼 연동 시작
├── stopIntegration()     - 연동 종료
├── fetchAndBroadcast()   - 5초마다 메시지 가져와서 전달
└── activeIntegrations    - 활성 연동 상태 관리
```

### 2.2 인터페이스 설계

```java
public interface ExternalChatClient {
    ChatPlatform getPlatform();
    void connect(PlatformCredentials credentials);
    void disconnect();
    boolean isConnected();
    List<ChatMessageRequest> fetchNewMessages();
}
```

**왜 이런 인터페이스인가?**
- `connect/disconnect`: 플랫폼마다 연결 방식 다름 (Polling vs WebSocket)
- `fetchNewMessages`: 통일된 메시지 수집 → ChatService로 전달
- `PlatformCredentials`: 플랫폼별 인증 정보 추상화

---

## 3. 플랫폼별 구현

### 3.1 YouTube Live Chat

**API**: YouTube Data API v3 - LiveChatMessages

**인증**:
- OAuth 2.0 필수
- Scope: `youtube.readonly` (읽기), `youtube` (쓰기)

**Polling 방식**:
```
GET https://www.googleapis.com/youtube/v3/liveChatMessages
    ?liveChatId={liveChatId}
    &part=snippet,authorDetails
    &pageToken={nextPageToken}
    &maxResults=200
```

**응답 예시**:
```json
{
    "pollingIntervalMillis": 5000,
    "nextPageToken": "xxx",
    "items": [
        {
            "id": "messageId",
            "snippet": {
                "type": "textMessageEvent",
                "textMessageDetails": { "messageText": "안녕!" }
            },
            "authorDetails": {
                "displayName": "사용자",
                "profileImageUrl": "https://..."
            }
        }
    ]
}
```

**필요한 정보**:
| 항목 | 설명 | 획득 방법 |
|------|------|----------|
| `accessToken` | OAuth 토큰 | Google OAuth 2.0 |
| `liveChatId` | 채팅방 ID | 방송 시작 시 API로 조회 |

---

### 3.2 치지직 (CHZZK)

**API**: 비공식 WebSocket API

**연결 흐름**:
1. 채널 정보 조회: `GET https://api.chzzk.naver.com/service/v1/channels/{channelId}`
2. `chatChannelId` 획득
3. WebSocket 연결: `wss://kr-ss1.chat.naver.com/chat`
4. 구독 메시지 전송

**메시지 형식**:
```json
{
    "cmd": 93101,  // 채팅 메시지
    "bdy": {
        "msg": "채팅 내용",
        "msgTypeCode": 1,  // 1: 일반, 10: 후원
        "profile": {
            "nickname": "닉네임",
            "profileImageUrl": "https://..."
        },
        "extras": {
            "payAmount": 1000  // 후원 금액
        }
    }
}
```

**필요한 정보**:
| 항목 | 설명 | 획득 방법 |
|------|------|----------|
| `chzzkChannelId` | 채널 ID | 치지직 채널 URL에서 추출 |

---

## 4. ChatIntegrationService

### 4.1 폴링 방식 선택 이유

```java
@Scheduled(fixedDelay = 5000)
public void fetchAndBroadcast() {
    // 모든 활성 클라이언트에서 메시지 수집
}
```

| 대안 | 장점 | 단점 |
|------|------|------|
| **Polling (선택)** | 구현 간단, 모든 플랫폼 통일 | 5초 딜레이 |
| 개별 WebSocket | 실시간 | 플랫폼별 구현 복잡 |

**결정 이유**:
- YouTube는 Polling만 지원 (API 제한)
- 치지직은 WebSocket이지만 버퍼 후 Polling 방식으로 통일
- 5초 딜레이는 채팅 특성상 허용 가능

### 4.2 상태 관리

```java
// studioId → (platform → client)
Map<Long, Map<ChatPlatform, ExternalChatClient>> activeIntegrations
```

**왜 이 구조인가?**
- 한 스튜디오에서 여러 플랫폼 동시 연동 가능
- 플랫폼별 독립적 시작/종료
- ConcurrentHashMap으로 thread-safe

---

## 5. API 키 설정

### application.yml 템플릿

```yaml
external-chat:
  youtube:
    client-id: ${YOUTUBE_CLIENT_ID}
    client-secret: ${YOUTUBE_CLIENT_SECRET}
    redirect-uri: ${YOUTUBE_REDIRECT_URI}
  chzzk:
    # 인증 불필요 (공개 채팅방)
```

### 환경변수

```bash
# YouTube OAuth
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:8082/oauth/youtube/callback

# 치지직은 별도 키 불필요
```

---

## 6. 구현 순서

1. [x] ExternalChatClient 인터페이스
2. [x] YouTubeChatClient 구조 (API 호출 TODO)
3. [x] ChzzkChatClient 구조 (WebSocket TODO)
4. [x] ChatIntegrationService
5. [x] PlatformCredentials DTO
6. [ ] YouTube OAuth 연동
7. [ ] YouTube API 호출 구현
8. [ ] 치지직 WebSocket 연결 구현
9. [ ] 연동 API 컨트롤러

---

## 7. 파일 목록

| 파일 | 설명 |
|------|------|
| `chat/integration/ExternalChatClient.java` | 공통 인터페이스 |
| `chat/integration/YouTubeChatClient.java` | YouTube 클라이언트 |
| `chat/integration/ChzzkChatClient.java` | 치지직 클라이언트 |
| `chat/integration/TwitchChatClient.java` | Twitch 클라이언트 |
| `chat/integration/ChatIntegrationService.java` | 통합 서비스 |
| `chat/integration/PlatformCredentials.java` | 인증 정보 DTO |

---

## 8. 분당 카운터 연동

외부 채팅도 자동으로 카운터에 포함됩니다:

```java
// ChatService.receiveExternalMessage()
public ChatMessageResponse receiveExternalMessage(ChatMessageRequest request) {
    return sendMessage(null, request);  // sendMessage 내부에서 카운터 증가
}
```

흐름:
```
외부 채팅 → ChatService.sendMessage() → commentCounterService.incrementCount()
```
