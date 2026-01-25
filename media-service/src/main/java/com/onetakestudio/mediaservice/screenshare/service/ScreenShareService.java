package com.onetakestudio.mediaservice.screenshare.service;

import com.onetakestudio.mediaservice.global.exception.BusinessException;
import com.onetakestudio.mediaservice.global.exception.ErrorCode;
import com.onetakestudio.mediaservice.screenshare.dto.ScreenShareResponse;
import com.onetakestudio.mediaservice.screenshare.dto.ScreenShareStartRequest;
import com.onetakestudio.mediaservice.screenshare.entity.ScreenShareSession;
import com.onetakestudio.mediaservice.screenshare.entity.ScreenShareStatus;
import com.onetakestudio.mediaservice.screenshare.repository.ScreenShareSessionRepository;
import com.onetakestudio.mediaservice.stream.entity.SessionStatus;
import com.onetakestudio.mediaservice.stream.entity.StreamSession;
import com.onetakestudio.mediaservice.stream.repository.StreamSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScreenShareService {

    private final ScreenShareSessionRepository screenShareSessionRepository;
    private final StreamSessionRepository streamSessionRepository;

    @Transactional
    public ScreenShareResponse startScreenShare(Long userId, ScreenShareStartRequest request) {
        // 이미 화면 공유 중인지 확인
        if (screenShareSessionRepository.existsByStudioIdAndStatus(request.getStudioId(), ScreenShareStatus.ACTIVE)) {
            throw new BusinessException(ErrorCode.SCREEN_SHARE_ALREADY_ACTIVE);
        }

        // 활성 스트림 세션 확인
        StreamSession streamSession = streamSessionRepository
                .findByStudioIdAndStatus(request.getStudioId(), SessionStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.STREAM_SESSION_NOT_FOUND));

        // 화면 공유 세션 생성
        String shareId = generateShareId();
        String sourceType = request.getSourceType() != null ? request.getSourceType() : "screen";

        ScreenShareSession screenShareSession = ScreenShareSession.builder()
                .studioId(request.getStudioId())
                .userId(userId)
                .streamSessionId(streamSession.getId())
                .shareId(shareId)
                .status(ScreenShareStatus.ACTIVE)
                .sourceType(sourceType)
                .build();

        // WebRTC screen track 시작 (프론트엔드에서 처리, 백엔드는 세션 관리만)
        String trackId = startWebRtcScreenTrack(streamSession.getRoomName(), shareId);
        screenShareSession.startSharing(trackId);

        screenShareSessionRepository.save(screenShareSession);

        log.info("Screen share started: studioId={}, shareId={}, userId={}",
                request.getStudioId(), shareId, userId);

        return ScreenShareResponse.from(screenShareSession);
    }

    @Transactional
    public ScreenShareResponse stopScreenShare(String shareId) {
        ScreenShareSession screenShareSession = screenShareSessionRepository
                .findByShareId(shareId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SCREEN_SHARE_NOT_FOUND));

        if (screenShareSession.getStatus() != ScreenShareStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.SCREEN_SHARE_NOT_ACTIVE);
        }

        // WebRTC screen track 중지
        stopWebRtcScreenTrack(screenShareSession.getTrackId());

        screenShareSession.stopSharing();
        screenShareSessionRepository.save(screenShareSession);

        log.info("Screen share stopped: shareId={}, studioId={}", shareId, screenShareSession.getStudioId());

        return ScreenShareResponse.from(screenShareSession);
    }

    public ScreenShareResponse getActiveScreenShare(Long studioId) {
        ScreenShareSession screenShareSession = screenShareSessionRepository
                .findByStudioIdAndStatus(studioId, ScreenShareStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.SCREEN_SHARE_NOT_ACTIVE));

        return ScreenShareResponse.from(screenShareSession);
    }

    private String generateShareId() {
        return "share-" + UUID.randomUUID().toString();
    }

    private String startWebRtcScreenTrack(String roomName, String shareId) {
        // TODO: LiveKit 또는 WebRTC SDK 연동
        // 프론트엔드에서 screen track을 생성하고, 백엔드는 해당 track을 room에 publish
        // 실제로는 프론트엔드가 직접 WebRTC로 screen track을 보내므로, 백엔드는 세션 관리만 수행
        log.info("Starting WebRTC screen track for room: {}, shareId: {}", roomName, shareId);
        return "track-" + UUID.randomUUID().toString();
    }

    private void stopWebRtcScreenTrack(String trackId) {
        // TODO: WebRTC track 중지
        // 프론트엔드에서 screen track을 unpublish
        log.info("Stopping WebRTC screen track: {}", trackId);
    }
}
