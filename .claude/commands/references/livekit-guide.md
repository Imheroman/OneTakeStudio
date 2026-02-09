# LiveKit 연동 가이드

## LiveKit이 뭔가?

### 쉽게 설명
```
화상회의 앱 생각해보세요 (Zoom, Google Meet)
- 내 카메라 영상이 다른 사람에게 전달됨
- 다른 사람 영상이 나에게 보임

이걸 가능하게 하는 서버가 LiveKit!
```

### 기술적 설명
```
LiveKit = WebRTC SFU (Selective Forwarding Unit)

브라우저 A ──영상──→ LiveKit ──영상──→ 브라우저 B
브라우저 A ←──영상── LiveKit ←──영상── 브라우저 B

- 브라우저끼리 직접 연결하면 부하가 큼 (P2P 방식)
- LiveKit이 중간에서 영상을 중계해줌
- + 녹화, RTMP 송출 기능도 제공
```

## 우리가 할 일 vs LiveKit이 할 일

| 우리 (Spring Boot) | LiveKit |
|-------------------|---------|
| "토큰 발급해줘" 요청 처리 | 토큰 검증하고 연결 허용 |
| "녹화 시작해" 명령 | 실제로 영상 녹화 |
| "YouTube로 송출해" 명령 | RTMP 스트림 전송 |
| 결과 DB에 저장 | 미디어 처리 |

**핵심: 우리는 "명령"만 내리고, LiveKit이 "실행"한다**

## 의존성 추가

### pom.xml
```xml
<dependency>
    <groupId>io.livekit</groupId>
    <artifactId>livekit-server</artifactId>
    <version>0.6.1</version>
</dependency>
```

## 설정

### application.yml
```yaml
livekit:
  url: ws://localhost:7880      # LiveKit 서버 주소
  api-key: devkey               # 인증용 API 키
  api-secret: secret            # 인증용 시크릿
```

### LiveKitProperties.java
```java
@ConfigurationProperties(prefix = "livekit")
@Getter
@Setter
public class LiveKitProperties {
    private String url;
    private String apiKey;
    private String apiSecret;
}
```

## 주요 기능 구현

### 1. 토큰 발급

**왜 필요한가?**
```
프론트엔드가 LiveKit 서버에 연결하려면 "허가증"이 필요
이 허가증 = JWT 토큰
백엔드가 "이 사람은 OK"라고 서명해서 발급
```

**코드**
```java
public String createToken(String roomName, String participantName, boolean canPublish) {
    // 토큰 생성
    AccessToken token = new AccessToken(apiKey, apiSecret);
    
    // 누구인지 설정
    token.setName(participantName);
    token.setIdentity(participantName);
    
    // 권한 설정
    token.addGrants(
        new RoomJoin(true),           // 방 입장 OK
        new RoomName(roomName),       // 이 방에만 입장 가능
        new CanPublish(canPublish)    // 영상 송출 가능?
    );
    
    // 유효시간 (6시간)
    token.setTtl(Duration.ofHours(6));
    
    return token.toJwt();  // JWT 문자열 반환
}
```

### 2. 녹화 시작

**왜 필요한가?**
```
방송 중인 영상을 파일로 저장하고 싶을 때
LiveKit의 Egress 기능 사용
```

**Egress가 뭔가?**
```
Egress = "내보내기"
- Room에서 나가는 미디어를 처리
- 녹화: 파일로 저장
- 송출: RTMP로 YouTube/Twitch에 전송
```

**코드**
```java
public String startRecording(String roomName, String outputPath) {
    // Egress 클라이언트 생성
    EgressServiceClient client = EgressServiceClient.createClient(
        liveKitUrl, apiKey, apiSecret
    );
    
    // 녹화 요청 생성
    RoomCompositeEgressRequest request = RoomCompositeEgressRequest.newBuilder()
        .setRoomName(roomName)
        .setFile(EncodedFileOutput.newBuilder()
            .setFilepath(outputPath)  // 저장 경로: /recordings/room123.mp4
            .setFileType(EncodedFileType.MP4)
            .build())
        .build();
    
    // 녹화 시작
    EgressInfo info = client.startRoomCompositeEgress(request).get();
    
    return info.getEgressId();  // 나중에 중지할 때 사용
}
```

### 3. 녹화 중지

```java
public void stopRecording(String egressId) {
    EgressServiceClient client = EgressServiceClient.createClient(
        liveKitUrl, apiKey, apiSecret
    );
    
    client.stopEgress(egressId);
}
```

### 4. RTMP 송출

**왜 필요한가?**
```
방송을 YouTube, Twitch에 내보내고 싶을 때
LiveKit이 WebRTC → RTMP 변환해서 송출
```

**코드**
```java
public String startRtmpPublish(String roomName, String rtmpUrl, String streamKey) {
    EgressServiceClient client = EgressServiceClient.createClient(
        liveKitUrl, apiKey, apiSecret
    );
    
    // 전체 RTMP URL: rtmp://a.rtmp.youtube.com/live2/xxxx-xxxx-xxxx
    String fullUrl = rtmpUrl + "/" + streamKey;
    
    RoomCompositeEgressRequest request = RoomCompositeEgressRequest.newBuilder()
        .setRoomName(roomName)
        .addStreamOutputs(StreamOutput.newBuilder()
            .setProtocol(StreamProtocol.RTMP)
            .addUrls(fullUrl)
            .build())
        .build();
    
    EgressInfo info = client.startRoomCompositeEgress(request).get();
    
    return info.getEgressId();
}
```

## Webhook (알림 받기)

**왜 필요한가?**
```
녹화가 언제 끝났는지 알고 싶을 때
LiveKit이 우리 서버에 "녹화 끝났어!" 알려줌
```

### application.yml
```yaml
# LiveKit 서버 설정에 webhook URL 추가 필요
# livekit.yaml:
# webhook:
#   urls:
#     - http://our-backend:8081/webhooks/livekit
```

### WebhookController.java
```java
@RestController
@RequestMapping("/webhooks/livekit")
@RequiredArgsConstructor
public class LiveKitWebhookController {

    private final RecordingService recordingService;

    @PostMapping
    public ResponseEntity<Void> handleWebhook(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody String payload) {
        
        // 1. 서명 검증 (LiveKit이 보낸 게 맞는지)
        WebhookReceiver receiver = new WebhookReceiver(apiKey, apiSecret);
        WebhookEvent event = receiver.receive(payload, authHeader);
        
        // 2. 이벤트 처리
        if (event.getEvent().equals("egress_ended")) {
            EgressInfo info = event.getEgressInfo();
            
            // 녹화 완료 처리
            recordingService.completeRecording(
                info.getEgressId(),
                info.getFile().getFilename(),
                info.getFile().getSize()
            );
        }
        
        return ResponseEntity.ok().build();
    }
}
```

## 에러 처리

### 자주 발생하는 에러

| 에러 | 원인 | 해결 |
|------|------|------|
| `InvalidApiKey` | API Key 틀림 | application.yml 확인 |
| `RoomNotFound` | 방이 없음 | 방 먼저 생성 or 토큰 발급 대기 |
| `EgressNotFound` | 녹화 ID 틀림 | egressId 확인 |
| `Connection refused` | LiveKit 서버 안 켜짐 | Docker 상태 확인 |

### 예외 처리 코드
```java
try {
    String token = liveKitService.createToken(roomName, participantName, true);
} catch (Exception e) {
    log.error("LiveKit 토큰 생성 실패: {}", e.getMessage());
    throw new BusinessException(ErrorCode.LIVEKIT_ERROR);
}
```

## 테스트 방법

### LiveKit 없이 테스트 (Mock)
```java
@MockBean
private LiveKitService liveKitService;

@Test
void 토큰발급_성공() {
    // given
    given(liveKitService.createToken(any(), any(), anyBoolean()))
        .willReturn("mock-token");
    
    // when & then
    ...
}
```

### LiveKit 있을 때 테스트
```bash
# 1. LiveKit 실행
docker compose up -d

# 2. 토큰 발급 테스트
curl -X POST http://localhost:8081/media/token \
  -H "Content-Type: application/json" \
  -d '{"studioId": "test-123", "role": "host"}'
```
