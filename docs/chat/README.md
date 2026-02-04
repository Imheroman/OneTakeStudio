# 실시간 채팅 연동 시스템

## 개요

OneTakeStudio의 멀티 플랫폼 채팅 연동 시스템입니다.
YouTube와 치지직(Chzzk) 플랫폼의 실시간 채팅을 수집하여 통합 관리합니다.

## 지원 플랫폼

| 플랫폼 | 연동 방식 | 인증 | 상태 |
|--------|----------|------|------|
| YouTube | REST API (Polling) | OAuth 2.0 | ✅ 구현 완료 |
| Chzzk | WebSocket | 불필요 | ✅ 구현 완료 |

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ YouTube     │  │ Chzzk       │  │ 채팅 화면              │ │
│  │ OAuth 로그인│  │ 채널ID 입력 │  │ (WebSocket 수신)       │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────▲────────────┘ │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      │
┌─────────────────────────────────────────────────┼───────────────┐
│                   Backend (Media Service)       │               │
│                                                 │               │
│  ┌──────────────────────────────────────────────┼─────────────┐│
│  │           ChatIntegrationController          │             ││
│  │  POST /{studioId}/youtube/start              │             ││
│  │  POST /{studioId}/chzzk/start                │             ││
│  │  POST /{studioId}/{platform}/stop            │             ││
│  │  GET  /{studioId}/status                     │             ││
│  └──────────────────┬───────────────────────────┼─────────────┘│
│                     │                           │               │
│                     ▼                           │               │
│  ┌──────────────────────────────────────────────┼─────────────┐│
│  │           ChatIntegrationService             │             ││
│  │  - startIntegration()                        │             ││
│  │  - stopIntegration()                         │             ││
│  │  - fetchAndBroadcast() [5초마다 스케줄링]    │             ││
│  └───────┬─────────────────────┬────────────────┼─────────────┘│
│          │                     │                │               │
│          ▼                     ▼                │               │
│  ┌───────────────┐     ┌───────────────┐        │               │
│  │YouTubeChatClient    │ChzzkChatClient│        │               │
│  │ - REST API    │     │ - WebSocket   │        │               │
│  │ - 폴링 방식   │     │ - 실시간 수신 │        │               │
│  └───────┬───────┘     └───────┬───────┘        │               │
│          │                     │                │               │
│          └──────────┬──────────┘                │               │
│                     ▼                           │               │
│          ┌──────────────────┐                   │               │
│          │   ChatService    │───────────────────┘               │
│          │ - DB 저장        │    WebSocket 브로드캐스트         │
│          │ - 댓글 카운팅    │                                   │
│          └──────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
          │                     │
          ▼                     ▼
┌─────────────────┐     ┌─────────────────┐
│   YouTube API   │     │   Chzzk API     │
│   (Google)      │     │   (Naver)       │
└─────────────────┘     └─────────────────┘
```

---

## 플로우

### 1. 채팅 연동 시작

```
1. 프론트엔드에서 연동 시작 API 호출
2. ChatIntegrationController가 요청 수신
3. ChatIntegrationService.startIntegration() 호출
4. 해당 플랫폼 클라이언트 연결 (YouTube: API 검증 / Chzzk: WebSocket 연결)
5. activeIntegrations 맵에 등록
```

### 2. 채팅 메시지 수집

```
1. 스케줄러가 5초마다 fetchAndBroadcast() 실행
2. 각 활성 클라이언트에서 fetchNewMessages() 호출
   - YouTube: REST API 폴링
   - Chzzk: WebSocket 버퍼에서 꺼내기
3. ChatService.receiveExternalMessage()로 전달
4. DB 저장 + WebSocket으로 프론트엔드에 브로드캐스트
5. CommentCounterService에서 분당 댓글 수 집계
```

### 3. 채팅 연동 종료

```
1. 프론트엔드에서 연동 종료 API 호출
2. ChatIntegrationService.stopIntegration() 호출
3. 해당 클라이언트 disconnect()
4. activeIntegrations 맵에서 제거
```

---

## API 명세

### 연동 시작

**YouTube 연동**
```http
POST /api/media/chat/integration/{studioId}/youtube/start
Content-Type: application/json

{
  "accessToken": "ya29.xxx...",
  "refreshToken": "1//xxx...",
  "liveChatId": "Cg0KC..."
}
```

**Chzzk 연동**
```http
POST /api/media/chat/integration/{studioId}/chzzk/start
Content-Type: application/json

{
  "channelId": "abc123def456"
}
```

### 연동 종료

**특정 플랫폼 종료**
```http
POST /api/media/chat/integration/{studioId}/{platform}/stop
```

**모든 플랫폼 종료**
```http
POST /api/media/chat/integration/{studioId}/stop-all
```

### 상태 조회

```http
GET /api/media/chat/integration/{studioId}/status

Response:
{
  "data": {
    "studioId": 123,
    "activePlatforms": ["YOUTUBE", "CHZZK"],
    "platformStatus": {
      "YOUTUBE": true,
      "CHZZK": true
    }
  }
}
```

---

## 파일 구조

```
media-service/src/main/java/com/onetake/media/chat/
├── controller/
│   └── ChatIntegrationController.java    # 연동 API 컨트롤러
├── integration/
│   ├── ExternalChatClient.java           # 외부 채팅 클라이언트 인터페이스
│   ├── PlatformCredentials.java          # 플랫폼 인증 정보 DTO
│   ├── ChatIntegrationService.java       # 연동 관리 서비스
│   ├── YouTubeChatClient.java            # YouTube 채팅 클라이언트
│   └── ChzzkChatClient.java              # 치지직 채팅 클라이언트
├── service/
│   ├── ChatService.java                  # 채팅 메시지 처리 서비스
│   └── CommentCounterService.java        # 분당 댓글 수 집계 서비스
├── dto/
│   └── ChatMessageRequest.java           # 채팅 메시지 DTO
└── entity/
    ├── ChatPlatform.java                 # 플랫폼 enum
    └── MessageType.java                  # 메시지 타입 enum (CHAT, SUPER_CHAT)
```

---

## 플랫폼별 구현 상세

### YouTube Live Chat

| 항목 | 내용 |
|------|------|
| 연동 방식 | REST API 폴링 |
| API | YouTube Data API v3 - LiveChatMessages |
| 인증 | OAuth 2.0 (Access Token + Refresh Token) |
| 폴링 주기 | YouTube 권장값 사용 (약 5초) |
| 지원 메시지 | 일반 채팅, 슈퍼챗, 슈퍼스티커 |

**주요 기능**:
- 토큰 만료 시 자동 갱신 (refreshToken 사용)
- nextPageToken으로 중복 메시지 방지
- 슈퍼챗 금액/통화 파싱

### Chzzk (치지직)

| 항목 | 내용 |
|------|------|
| 연동 방식 | WebSocket |
| 인증 | 불필요 (READ 전용) |
| 실시간성 | 즉시 수신 |
| 지원 메시지 | 일반 채팅, 후원 메시지 |

**주요 기능**:
- 채널 ID로 chatChannelId 자동 조회
- PING/PONG으로 연결 유지
- 후원 금액(payAmount) 파싱

---

## 댓글 카운터 연동

스트리밍 세션과 댓글 카운터가 연동되어 있습니다.

```
StreamService.activateSession()
    └── CommentCounterService.startCounting(studioId)

StreamService.endStream()
    └── CommentCounterService.stopCounting(studioId)
```

- 스트리밍 시작 시 분당 댓글 집계 시작
- 녹화 종료 시 RecordingService에서 저장
- 스트리밍만 할 경우 저장 없이 종료

---

## 환경 설정

### YouTube 연동 시 필요한 환경 변수

```
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
```

### Chzzk 연동

- 별도 환경 변수 불필요
- 채널 URL에서 채널 ID만 추출하면 됨
- 예: `https://chzzk.naver.com/live/abc123` → `abc123`

---

## 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `feat(chat): StreamService에 댓글 카운터 연동 추가` | 스트리밍 세션에 댓글 집계 연동 |
| `feat(chat): YouTube Live Chat API 연동 구현` | YouTube 채팅 클라이언트 구현 |
| `feat(chat): 치지직 채팅 연동 구현` | Chzzk 채팅 클라이언트 구현 |
| `refactor: Twitch 관련 코드 전체 제거` | YouTube, Chzzk만 사용 |

---

## 향후 개선 사항

- [ ] OAuth 콜백 처리 백엔드 구현 (보안 강화)
- [ ] 연결 끊김 시 자동 재연결
- [ ] 채팅 필터링 (금지어, 스팸 차단)
- [ ] 채팅 통계 대시보드
