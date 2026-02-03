package com.onetake.media.stream.service;

import com.onetake.media.chat.service.CommentCounterService;
import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import com.onetake.media.settings.service.MediaSettingsService;
import com.onetake.media.stream.dto.IceServerResponse;
import com.onetake.media.stream.dto.StreamSessionResponse;
import com.onetake.media.stream.dto.StreamTokenRequest;
import com.onetake.media.stream.dto.StreamTokenResponse;
import com.onetake.media.stream.entity.SessionStatus;
import com.onetake.media.stream.entity.StreamSession;
import com.onetake.media.stream.repository.StreamSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StreamService {

    private final StreamSessionRepository streamSessionRepository;
    private final LiveKitService liveKitService;
    private final MediaSettingsService mediaSettingsService;
    private final CommentCounterService commentCounterService;
    private final PlatformTransactionManager transactionManager;

    @Value("${livekit.turn.urls:}")
    private List<String> turnUrls;

    @Value("${livekit.turn.username:}")
    private String turnUsername;

    @Value("${livekit.turn.credential:}")
    private String turnCredential;

    @Transactional
    public StreamTokenResponse joinStream(Long userId, StreamTokenRequest request) {
        String roomName = "studio-" + request.getStudioId();

        // LiveKit 토큰 생성 (participantIdentity 필요)
        StreamTokenResponse tokenResponse = liveKitService.generateToken(userId, request);

        // room_name 유니크: 이미 해당 스튜디오 세션이 있으면 재사용 (중복 삽입 방지)
        Optional<StreamSession> existing = streamSessionRepository.findByRoomName(roomName);
        if (existing.isPresent()) {
            StreamSession session = existing.get();
            session.reuseForNewParticipant(userId, tokenResponse.getParticipantIdentity(), request.getMetadata());
            streamSessionRepository.save(session);
            mediaSettingsService.initializeSessionState(userId, request.getStudioId(), session.getId());
            log.info("Reused stream session for studio {} (roomName={})", request.getStudioId(), roomName);
            return tokenResponse;
        }

        // 새 세션 저장 직전 이중 확인 (동시 요청 레이스 시 다른 요청이 이미 insert 했을 수 있음)
        Optional<StreamSession> existingAgain = streamSessionRepository.findByRoomName(roomName);
        if (existingAgain.isPresent()) {
            StreamSession session = existingAgain.get();
            session.reuseForNewParticipant(userId, tokenResponse.getParticipantIdentity(), request.getMetadata());
            streamSessionRepository.save(session);
            mediaSettingsService.initializeSessionState(userId, request.getStudioId(), session.getId());
            log.info("Reused stream session (race) for studio {} (roomName={})", request.getStudioId(), roomName);
            return tokenResponse;
        }

        // 새 세션 저장 (중복 키 시 재조회 후 재사용)
        StreamSession session = StreamSession.builder()
                .studioId(request.getStudioId())
                .userId(userId)
                .roomName(roomName)
                .participantIdentity(tokenResponse.getParticipantIdentity())
                .status(SessionStatus.CONNECTING)
                .metadata(request.getMetadata())
                .build();

        try {
            StreamSession savedSession = streamSessionRepository.save(session);
            mediaSettingsService.initializeSessionState(userId, request.getStudioId(), savedSession.getId());
            log.info("Stream session created: studioId={}, userId={}, roomName={}",
                    request.getStudioId(), userId, roomName);
            return tokenResponse;
        } catch (DataIntegrityViolationException e) {
            // 동시 요청 등으로 중복 키 발생 시 새 트랜잭션에서 기존 행 재사용 후 토큰 반환
            String participantIdentity = tokenResponse.getParticipantIdentity();
            Long studioId = request.getStudioId();
            String metadata = request.getMetadata();
            DefaultTransactionDefinition def = new DefaultTransactionDefinition(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            TransactionStatus txStatus = transactionManager.getTransaction(def);
            try {
                streamSessionRepository.findByRoomName(roomName)
                        .ifPresent(s -> {
                            s.reuseForNewParticipant(userId, participantIdentity, metadata);
                            streamSessionRepository.save(s);
                            mediaSettingsService.initializeSessionState(userId, studioId, s.getId());
                        });
                transactionManager.commit(txStatus);
            } catch (Exception ex) {
                transactionManager.rollback(txStatus);
                log.warn("Reuse after duplicate key failed for roomName={}", roomName, ex);
            }
            log.info("Stream session reused after duplicate key for studio {} (roomName={})",
                    request.getStudioId(), roomName);
            return tokenResponse;
        }
    }

    @Transactional
    public void activateSession(String roomName, String participantIdentity) {
        streamSessionRepository.findByRoomName(roomName)
                .ifPresent(session -> {
                    if (session.getParticipantIdentity().equals(participantIdentity)) {
                        session.activate();

                        // 댓글 카운터 시작 (스트리밍만 할 때도 집계 가능)
                        commentCounterService.startCounting(session.getStudioId());

                        log.info("Stream session activated: roomName={}, participant={}",
                                roomName, participantIdentity);
                    }
                });
    }

    @Transactional
    public void leaveStream(Long studioId, Long userId) {
        // CONNECTING 또는 ACTIVE 상태인 세션 모두 처리
        streamSessionRepository.findByStudioIdAndUserIdAndStatusIn(
                studioId, userId, List.of(SessionStatus.CONNECTING, SessionStatus.ACTIVE))
                .ifPresent(session -> {
                    session.disconnect();
                    liveKitService.removeParticipant(session.getRoomName(), session.getParticipantIdentity());
                    log.info("User {} left stream for studio {}", userId, studioId);
                });

        // 미디어 상태 자동 종료 (세션 유무와 무관하게 실행)
        mediaSettingsService.terminateSessionState(studioId, userId);
    }

    @Transactional
    public void endStream(Long studioId) {
        streamSessionRepository.findByStudioIdAndStatus(studioId, SessionStatus.ACTIVE)
                .ifPresent(session -> {
                    session.close();
                    liveKitService.deleteRoom(session.getRoomName());

                    // 댓글 카운터 중지 (저장 없이 - 녹화 종료 시 RecordingService에서 저장)
                    commentCounterService.stopCounting(studioId);

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
