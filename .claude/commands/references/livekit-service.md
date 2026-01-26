# LiveKitService 전체 코드

Media Service에서 LiveKit 서버와 통신하는 핵심 클래스

## LiveKitService.java

```java
package com.onetakestudio.media.stream.service;

import com.onetakestudio.media.global.exception.BusinessException;
import com.onetakestudio.media.global.exception.ErrorCode;
import io.livekit.server.*;
import livekit.LivekitEgress.*;
import livekit.LivekitModels.ParticipantPermission;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.ExecutionException;

/**
 * LiveKit 서버와 통신하는 서비스
 * 
 * 역할:
 * - WebRTC 토큰 발급
 * - 녹화(Egress) 시작/중지
 * - RTMP 송출 시작/중지
 */
@Slf4j
@Service
public class LiveKitService {

    private final String serverUrl;
    private final String apiKey;
    private final String apiSecret;

    public LiveKitService(
            @Value("${livekit.url}") String serverUrl,
            @Value("${livekit.api-key}") String apiKey,
            @Value("${livekit.api-secret}") String apiSecret) {
        this.serverUrl = serverUrl;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        
        log.info("LiveKit 서비스 초기화: url={}", serverUrl);
    }

    // ==========================================
    // 1. 토큰 발급
    // ==========================================

    /**
     * WebRTC 연결용 토큰 발급
     * 
     * @param roomName 방 이름 (보통 studioId)
     * @param participantName 참가자 이름 (보통 oduserId)
     * @param canPublish true: 영상 송출 가능 (host/guest), false: 시청만 (viewer)
     * @return JWT 토큰 문자열
     */
    public String createToken(String roomName, String participantName, boolean canPublish) {
        log.debug("토큰 생성 시작: room={}, participant={}, canPublish={}", 
                  roomName, participantName, canPublish);

        try {
            // AccessToken 생성
            AccessToken token = new AccessToken(apiKey, apiSecret);
            
            // 참가자 정보 설정
            token.setName(participantName);
            token.setIdentity(participantName);
            
            // 권한 설정
            token.addGrants(new RoomJoin(true));           // 방 입장 허용
            token.addGrants(new RoomName(roomName));       // 특정 방에만 입장 가능
            token.addGrants(new CanPublish(canPublish));   // 영상 송출 권한
            token.addGrants(new CanSubscribe(true));       // 다른 참가자 영상 구독 권한
            
            // 유효 시간 (6시간)
            token.setTtl(Duration.ofHours(6));
            
            String jwt = token.toJwt();
            log.debug("토큰 생성 완료: room={}", roomName);
            
            return jwt;
            
        } catch (Exception e) {
            log.error("토큰 생성 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR, "토큰 생성에 실패했습니다");
        }
    }

    /**
     * LiveKit 서버 URL 반환
     */
    public String getServerUrl() {
        return serverUrl;
    }

    // ==========================================
    // 2. 녹화 (Recording)
    // ==========================================

    /**
     * 녹화 시작
     * 
     * @param roomName 녹화할 방 이름
     * @param outputPath 저장 경로 (예: /recordings/2025-01-25/abc123.mp4)
     * @return egressId (나중에 중지할 때 사용)
     */
    public String startRecording(String roomName, String outputPath) {
        log.info("녹화 시작 요청: room={}, path={}", roomName, outputPath);

        try {
            // Egress 클라이언트 생성
            EgressServiceClient client = createEgressClient();
            
            // 녹화 요청 설정
            RoomCompositeEgressRequest request = RoomCompositeEgressRequest.newBuilder()
                    .setRoomName(roomName)
                    .setFile(EncodedFileOutput.newBuilder()
                            .setFilepath(outputPath)
                            .setFileType(EncodedFileType.MP4)
                            .build())
                    // 영상 품질 설정
                    .setPreset(EncodingOptionsPreset.H264_1080P_30)
                    .build();
            
            // 녹화 시작
            EgressInfo info = client.startRoomCompositeEgress(request).get();
            
            String egressId = info.getEgressId();
            log.info("녹화 시작 완료: egressId={}", egressId);
            
            return egressId;
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("녹화 시작 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR, "녹화 시작에 실패했습니다");
        }
    }

    /**
     * 녹화 중지
     * 
     * @param egressId startRecording에서 받은 ID
     */
    public void stopRecording(String egressId) {
        log.info("녹화 중지 요청: egressId={}", egressId);

        try {
            EgressServiceClient client = createEgressClient();
            client.stopEgress(egressId).get();
            
            log.info("녹화 중지 완료: egressId={}", egressId);
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("녹화 중지 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR, "녹화 중지에 실패했습니다");
        }
    }

    /**
     * 녹화 상태 조회
     * 
     * @param egressId 조회할 Egress ID
     * @return EgressInfo (상태, 진행률 등)
     */
    public EgressInfo getRecordingStatus(String egressId) {
        try {
            EgressServiceClient client = createEgressClient();
            
            ListEgressRequest request = ListEgressRequest.newBuilder()
                    .setEgressId(egressId)
                    .build();
            
            List<EgressInfo> list = client.listEgress(request).get();
            
            if (list.isEmpty()) {
                throw new BusinessException(ErrorCode.RECORDING_NOT_FOUND);
            }
            
            return list.get(0);
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("녹화 상태 조회 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR);
        }
    }

    // ==========================================
    // 3. RTMP 송출 (Publish to YouTube/Twitch)
    // ==========================================

    /**
     * RTMP 송출 시작 (단일 플랫폼)
     * 
     * @param roomName 송출할 방 이름
     * @param rtmpUrl RTMP URL (예: rtmp://a.rtmp.youtube.com/live2/xxxx)
     * @return egressId
     */
    public String startRtmpPublish(String roomName, String rtmpUrl) {
        return startRtmpPublish(roomName, List.of(rtmpUrl));
    }

    /**
     * RTMP 송출 시작 (다중 플랫폼)
     * 
     * @param roomName 송출할 방 이름
     * @param rtmpUrls RTMP URL 목록 (YouTube, Twitch 동시 송출)
     * @return egressId
     */
    public String startRtmpPublish(String roomName, List<String> rtmpUrls) {
        log.info("RTMP 송출 시작 요청: room={}, urls={}", roomName, rtmpUrls.size());

        try {
            EgressServiceClient client = createEgressClient();
            
            // 스트림 출력 설정
            StreamOutput.Builder streamBuilder = StreamOutput.newBuilder()
                    .setProtocol(StreamProtocol.RTMP);
            
            for (String url : rtmpUrls) {
                streamBuilder.addUrls(url);
            }
            
            // 송출 요청 설정
            RoomCompositeEgressRequest request = RoomCompositeEgressRequest.newBuilder()
                    .setRoomName(roomName)
                    .addStreamOutputs(streamBuilder.build())
                    .setPreset(EncodingOptionsPreset.H264_1080P_30)
                    .build();
            
            // 송출 시작
            EgressInfo info = client.startRoomCompositeEgress(request).get();
            
            String egressId = info.getEgressId();
            log.info("RTMP 송출 시작 완료: egressId={}", egressId);
            
            return egressId;
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("RTMP 송출 시작 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR, "송출 시작에 실패했습니다");
        }
    }

    /**
     * RTMP 송출 중지
     * 
     * @param egressId startRtmpPublish에서 받은 ID
     */
    public void stopRtmpPublish(String egressId) {
        log.info("RTMP 송출 중지 요청: egressId={}", egressId);

        try {
            EgressServiceClient client = createEgressClient();
            client.stopEgress(egressId).get();
            
            log.info("RTMP 송출 중지 완료: egressId={}", egressId);
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("RTMP 송출 중지 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR, "송출 중지에 실패했습니다");
        }
    }

    // ==========================================
    // 4. 녹화 + 송출 동시 (Recording + RTMP)
    // ==========================================

    /**
     * 녹화와 RTMP 송출 동시 시작
     * 
     * @param roomName 방 이름
     * @param recordingPath 녹화 저장 경로
     * @param rtmpUrls RTMP URL 목록
     * @return egressId
     */
    public String startRecordingAndPublish(String roomName, String recordingPath, List<String> rtmpUrls) {
        log.info("녹화+송출 동시 시작: room={}", roomName);

        try {
            EgressServiceClient client = createEgressClient();
            
            // 스트림 출력 설정
            StreamOutput.Builder streamBuilder = StreamOutput.newBuilder()
                    .setProtocol(StreamProtocol.RTMP);
            for (String url : rtmpUrls) {
                streamBuilder.addUrls(url);
            }
            
            // 요청 설정 (녹화 + 송출)
            RoomCompositeEgressRequest request = RoomCompositeEgressRequest.newBuilder()
                    .setRoomName(roomName)
                    // 녹화
                    .setFile(EncodedFileOutput.newBuilder()
                            .setFilepath(recordingPath)
                            .setFileType(EncodedFileType.MP4)
                            .build())
                    // 송출
                    .addStreamOutputs(streamBuilder.build())
                    .setPreset(EncodingOptionsPreset.H264_1080P_30)
                    .build();
            
            EgressInfo info = client.startRoomCompositeEgress(request).get();
            
            log.info("녹화+송출 시작 완료: egressId={}", info.getEgressId());
            return info.getEgressId();
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("녹화+송출 시작 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR);
        }
    }

    // ==========================================
    // 5. Room 관리
    // ==========================================

    /**
     * 방에 있는 참가자 목록 조회
     */
    public List<livekit.LivekitModels.ParticipantInfo> listParticipants(String roomName) {
        try {
            RoomServiceClient client = createRoomClient();
            
            return client.listParticipants(roomName).get();
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("참가자 목록 조회 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR);
        }
    }

    /**
     * 참가자 강제 퇴장
     */
    public void removeParticipant(String roomName, String participantIdentity) {
        try {
            RoomServiceClient client = createRoomClient();
            
            client.removeParticipant(roomName, participantIdentity).get();
            log.info("참가자 퇴장: room={}, participant={}", roomName, participantIdentity);
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("참가자 퇴장 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR);
        }
    }

    /**
     * 참가자 음소거
     */
    public void muteParticipant(String roomName, String participantIdentity, boolean muted) {
        try {
            RoomServiceClient client = createRoomClient();
            
            ParticipantPermission permission = ParticipantPermission.newBuilder()
                    .setCanPublish(!muted)
                    .build();
            
            client.updateParticipant(roomName, participantIdentity, null, permission).get();
            log.info("참가자 음소거: room={}, participant={}, muted={}", 
                     roomName, participantIdentity, muted);
            
        } catch (InterruptedException | ExecutionException e) {
            log.error("음소거 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR);
        }
    }

    // ==========================================
    // Private 메서드
    // ==========================================

    private EgressServiceClient createEgressClient() {
        return EgressServiceClient.createClient(serverUrl, apiKey, apiSecret);
    }

    private RoomServiceClient createRoomClient() {
        return RoomServiceClient.createClient(serverUrl, apiKey, apiSecret);
    }
}
```

---

## 테스트 코드

### LiveKitServiceTest.java
```java
package com.onetakestudio.media.stream.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class LiveKitServiceTest {

    // 실제 LiveKit 없이 테스트
    // 토큰 생성 로직만 단위 테스트

    @Test
    void 토큰_생성_성공() {
        // given
        LiveKitService service = new LiveKitService(
                "ws://localhost:7880",
                "devkey",
                "secret"
        );

        // when
        String token = service.createToken("room-123", "user-456", true);

        // then
        assertThat(token).isNotEmpty();
        assertThat(token).startsWith("eyJ");  // JWT 형식
    }
}
```

### 통합 테스트 (LiveKit 실행 필요)
```java
@SpringBootTest
@ActiveProfiles("local")
class LiveKitServiceIntegrationTest {

    @Autowired
    private LiveKitService liveKitService;

    @Test
    @Disabled("LiveKit 서버 실행 필요")
    void 녹화_시작_중지_성공() {
        // given
        String roomName = "test-room-" + System.currentTimeMillis();

        // when
        String egressId = liveKitService.startRecording(roomName, "/tmp/test.mp4");

        // then
        assertThat(egressId).isNotEmpty();

        // cleanup
        liveKitService.stopRecording(egressId);
    }
}
```
