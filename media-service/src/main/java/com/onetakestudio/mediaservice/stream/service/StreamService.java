package com.onetakestudio.mediaservice.stream.service;

import com.onetakestudio.mediaservice.global.exception.BusinessException;
import com.onetakestudio.mediaservice.global.exception.ErrorCode;
import com.onetakestudio.mediaservice.stream.dto.IceServerResponse;
import com.onetakestudio.mediaservice.stream.dto.StreamSessionResponse;
import com.onetakestudio.mediaservice.stream.dto.StreamTokenRequest;
import com.onetakestudio.mediaservice.stream.dto.StreamTokenResponse;
import com.onetakestudio.mediaservice.stream.entity.SessionStatus;
import com.onetakestudio.mediaservice.stream.entity.StreamSession;
import com.onetakestudio.mediaservice.stream.repository.StreamSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StreamService {

    private final StreamSessionRepository streamSessionRepository;
    private final LiveKitService liveKitService;

    @Value("${livekit.turn.urls:}")
    private List<String> turnUrls;

    @Value("${livekit.turn.username:}")
    private String turnUsername;

    @Value("${livekit.turn.credential:}")
    private String turnCredential;

    @Transactional
    public StreamTokenResponse joinStream(Long userId, StreamTokenRequest request) {
        String roomName = "studio-" + request.getStudioId();

        // 기존 활성 세션이 있는지 확인
        streamSessionRepository.findByStudioIdAndStatus(request.getStudioId(), SessionStatus.ACTIVE)
                .ifPresent(session -> {
                    // 같은 사용자가 다시 참여하는 경우 허용
                    if (!session.getUserId().equals(userId)) {
                        log.info("User {} joining existing active session for studio {}", userId, request.getStudioId());
                    }
                });

        // LiveKit 토큰 생성
        StreamTokenResponse tokenResponse = liveKitService.generateToken(userId, request);

        // 세션 저장
        StreamSession session = StreamSession.builder()
                .studioId(request.getStudioId())
                .userId(userId)
                .roomName(roomName)
                .participantIdentity(tokenResponse.getParticipantIdentity())
                .status(SessionStatus.CONNECTING)
                .metadata(request.getMetadata())
                .build();

        streamSessionRepository.save(session);

        log.info("Stream session created: studioId={}, userId={}, roomName={}",
                request.getStudioId(), userId, roomName);

        return tokenResponse;
    }

    @Transactional
    public void activateSession(String roomName, String participantIdentity) {
        streamSessionRepository.findByRoomName(roomName)
                .ifPresent(session -> {
                    if (session.getParticipantIdentity().equals(participantIdentity)) {
                        session.activate();
                        log.info("Stream session activated: roomName={}, participant={}",
                                roomName, participantIdentity);
                    }
                });
    }

    @Transactional
    public void leaveStream(Long studioId, Long userId) {
        streamSessionRepository.findByStudioIdAndStatus(studioId, SessionStatus.ACTIVE)
                .filter(session -> session.getUserId().equals(userId))
                .ifPresent(session -> {
                    session.disconnect();
                    liveKitService.removeParticipant(session.getRoomName(), session.getParticipantIdentity());
                    log.info("User {} left stream for studio {}", userId, studioId);
                });
    }

    @Transactional
    public void endStream(Long studioId) {
        streamSessionRepository.findByStudioIdAndStatus(studioId, SessionStatus.ACTIVE)
                .ifPresent(session -> {
                    session.close();
                    liveKitService.deleteRoom(session.getRoomName());
                    log.info("Stream ended for studio {}", studioId);
                });
    }

    public StreamSessionResponse getActiveSession(Long studioId) {
        return streamSessionRepository.findByStudioIdAndStatus(studioId, SessionStatus.ACTIVE)
                .map(StreamSessionResponse::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.STREAM_SESSION_NOT_FOUND));
    }

    public List<StreamSessionResponse> getSessionHistory(Long studioId) {
        return streamSessionRepository.findByStudioId(studioId).stream()
                .map(StreamSessionResponse::from)
                .toList();
    }

    public IceServerResponse getIceServers() {
        List<IceServerResponse.IceServer> iceServers = List.of(
                IceServerResponse.IceServer.builder()
                        .urls(List.of("stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"))
                        .build()
        );

        // TURN 서버가 설정된 경우 추가
        if (turnUrls != null && !turnUrls.isEmpty()) {
            iceServers = List.of(
                    IceServerResponse.IceServer.builder()
                            .urls(List.of("stun:stun.l.google.com:19302"))
                            .build(),
                    IceServerResponse.IceServer.builder()
                            .urls(turnUrls)
                            .username(turnUsername)
                            .credential(turnCredential)
                            .build()
            );
        }

        return IceServerResponse.builder()
                .iceServers(iceServers)
                .build();
    }
}
