# 치지직(CHZZK) 채팅 연동

## 기능 개요

네이버 치지직(CHZZK) 스트리밍 플랫폼의 채팅을 WebSocket을 통해 실시간으로 수신하는 기능을 구현했습니다.

## API 스펙

### 1. 채널 정보 조회 (chatChannelId 획득)

```
GET https://api.chzzk.naver.com/polling/v2/channels/{channelId}/live-status

Headers:
    User-Agent: Mozilla/5.0

Response:
{
    "content": {
        "channelId": "xxx",
        "chatChannelId": "xxx"  // WebSocket 구독에 필요
    }
}
```

### 2. WebSocket 연결

**WebSocket URL**: `wss://kr-ss1.chat.naver.com/chat`

### 3. 연결 메시지

```json
{
    "cmd": 100,
    "ver": "2",
    "bdy": {
        "uid": null,
        "devType": 2001,
        "accTkn": null,
        "auth": "READ",
        "sid": {
            "svcid": "game",
            "cid": "{chatChannelId}"
        }
    }
}
```

### 4. 채팅 메시지 형식 (cmd=93101)

```json
{
    "cmd": 93101,
    "bdy": [{
        "msg": "채팅 내용",
        "msgTypeCode": 1,
        "profile": "{\"nickname\":\"닉네임\",\"profileImageUrl\":\"...\"}",
        "extras": "{\"payAmount\":1000}"
    }]
}
```

## 구현 상세

### 주요 기능

1. **connect()**: chatChannelId 조회 후 WebSocket 연결
2. **fetchNewMessages()**: 버퍼에서 새 메시지 가져오기
3. **parseWebSocketMessage()**: JSON 메시지 파싱 및 버퍼 저장

### 명령어 코드

| cmd | 설명 |
|-----|------|
| 0 | PING (서버 → 클라이언트) |
| 100 | CONNECT (연결 요청) |
| 10000 | PONG (클라이언트 → 서버) |
| 93101 | 채팅 메시지 |
| 93102 | 후원 메시지 |

### 메시지 타입 코드 (msgTypeCode)

| 코드 | 설명 |
|-----|------|
| 1 | 일반 채팅 |
| 10 | 후원 메시지 |

### profile/extras 파싱

치지직은 profile과 extras가 JSON 문자열로 저장되어 있어 이중 파싱이 필요합니다.

```java
// profile 파싱
String profileStr = msgNode.get("profile").asText();
JsonNode profile = objectMapper.readTree(profileStr);
String nickname = profile.get("nickname").asText();

// extras 파싱 (후원 금액)
String extrasStr = msgNode.get("extras").asText();
JsonNode extras = objectMapper.readTree(extrasStr);
Integer payAmount = extras.get("payAmount").asInt();
```

## 사용 예시

```java
// 1. 연결
PlatformCredentials credentials = PlatformCredentials.forChzzk(
    studioId,
    chzzkChannelId  // 예: "abc123def456"
);
chzzkChatClient.connect(credentials);

// 2. 메시지 폴링
while (chzzkChatClient.isConnected()) {
    List<ChatMessageRequest> messages = chzzkChatClient.fetchNewMessages();
    for (ChatMessageRequest msg : messages) {
        chatMessageService.saveMessage(msg);
    }
    Thread.sleep(100);
}

// 3. 연결 해제
chzzkChatClient.disconnect();
```

## 에러 처리

| 상황 | 처리 방식 |
|------|----------|
| cmd=0 (PING) 수신 | cmd=10000 (PONG) 즉시 응답 |
| chatChannelId 조회 실패 | 연결 중단, 로그 기록 |
| WebSocket 끊김 | onClose 콜백에서 로그 기록 |
| JSON 파싱 실패 | 해당 메시지 건너뛰기 |

## 주의사항

1. 치지직 API는 비공식이므로 변경될 수 있음
2. User-Agent 헤더 필수 (없으면 403 오류)
3. PING/PONG 처리를 안 하면 연결이 끊김
4. profile, extras 필드는 JSON 문자열이므로 이중 파싱 필요
5. 비로그인 상태로 READ 권한만 사용 (채팅 전송 불가)

## 채널 ID 확인 방법

치지직 채널 URL에서 채널 ID를 확인할 수 있습니다:
```
https://chzzk.naver.com/live/{channelId}
https://chzzk.naver.com/{channelId}
```
