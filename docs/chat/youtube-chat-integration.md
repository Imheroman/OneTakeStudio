# YouTube Live Chat API 연동

## 기능 개요

YouTube Live Chat API를 사용하여 YouTube 라이브 방송의 실시간 채팅을 가져오고 메시지를 전송하는 기능을 구현했습니다.

## API 스펙

### YouTube Data API v3 - LiveChatMessages

**Base URL**: `https://www.googleapis.com/youtube/v3`

### 메시지 조회
```
GET /liveChatMessages
    ?liveChatId={liveChatId}
    &part=snippet,authorDetails
    &pageToken={nextPageToken}
    &maxResults=200

Headers:
    Authorization: Bearer {accessToken}
```

**Response**:
```json
{
    "pollingIntervalMillis": 5000,
    "nextPageToken": "xxx",
    "items": [
        {
            "id": "messageId",
            "snippet": {
                "type": "textMessageEvent",
                "textMessageDetails": {
                    "messageText": "Hello!"
                }
            },
            "authorDetails": {
                "displayName": "UserName",
                "profileImageUrl": "https://..."
            }
        }
    ]
}
```

### 메시지 전송
```
POST /liveChatMessages?part=snippet

Headers:
    Authorization: Bearer {accessToken}
    Content-Type: application/json

Body:
{
    "snippet": {
        "liveChatId": "{liveChatId}",
        "type": "textMessageEvent",
        "textMessageDetails": {
            "messageText": "{message}"
        }
    }
}
```

## 구현 상세

### 주요 기능

1. **connect()**: API 연결 검증 및 초기 토큰 설정
2. **fetchNewMessages()**: 폴링으로 새 메시지 가져오기
3. **sendMessage()**: 채팅 메시지 전송
4. **refreshAccessToken()**: 토큰 만료 시 자동 갱신

### 메시지 타입 처리

| YouTube 타입 | 처리 방식 |
|-------------|----------|
| textMessageEvent | 일반 채팅 (CHAT) |
| superChatEvent | 슈퍼챗 (SUPER_CHAT) |
| superStickerEvent | 슈퍼스티커 (SUPER_CHAT) |

### 토큰 갱신

```java
// 401 Unauthorized 발생 시 자동 갱신 시도
private boolean refreshAccessToken() {
    String requestBody = "grant_type=refresh_token" +
            "&refresh_token=" + credentials.getRefreshToken() +
            "&client_id=" + getClientId() +
            "&client_secret=" + getClientSecret();

    // POST https://oauth2.googleapis.com/token
    // 새 access_token 획득 및 credentials 업데이트
}
```

## 사용 예시

```java
// 1. 연결
PlatformCredentials credentials = PlatformCredentials.forYouTube(
    studioId,
    accessToken,
    refreshToken,
    liveChatId
);
youTubeChatClient.connect(credentials);

// 2. 메시지 폴링 (권장 간격 사용)
while (youTubeChatClient.isConnected()) {
    List<ChatMessageRequest> messages = youTubeChatClient.fetchNewMessages();
    for (ChatMessageRequest msg : messages) {
        chatMessageService.saveMessage(msg);
    }
    Thread.sleep(youTubeChatClient.getPollingIntervalMillis());
}

// 3. 메시지 전송
youTubeChatClient.sendMessage("안녕하세요!");

// 4. 연결 해제
youTubeChatClient.disconnect();
```

## 환경 변수

| 변수명 | 설명 |
|-------|------|
| YOUTUBE_CLIENT_ID | Google OAuth 클라이언트 ID |
| YOUTUBE_CLIENT_SECRET | Google OAuth 클라이언트 시크릿 |

## OAuth Scope

| Scope | 용도 |
|-------|------|
| `youtube.readonly` | 채팅 읽기 |
| `youtube` | 채팅 쓰기 |

## 에러 처리

| 에러 | 처리 방식 |
|------|----------|
| 401 Unauthorized | refreshToken으로 자동 갱신 시도 |
| 403 Forbidden | 권한 부족 - 로그 기록 |
| 404 Not Found | 방송 종료 - 연결 해제 |
| Rate Limit | pollingIntervalMillis 준수로 방지 |

## 주의사항

1. YouTube API는 폴링 기반이므로 `pollingIntervalMillis` 응답값을 반드시 준수해야 함
2. 슈퍼챗 금액은 `amountMicros / 1,000,000`으로 계산
3. 방송이 종료되면 liveChatId가 무효화됨
