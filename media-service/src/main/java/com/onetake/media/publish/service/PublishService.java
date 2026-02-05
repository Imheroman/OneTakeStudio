package com.onetake.media.publish.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import com.onetake.media.publish.dto.PublishResponse;
import com.onetake.media.publish.dto.PublishStartRequest;
import com.onetake.media.publish.dto.PublishStatusResponse;
import com.onetake.media.publish.event.PublishEventPublisher;
import com.onetake.media.publish.entity.PublishDestination;
import com.onetake.media.publish.entity.PublishSession;
import com.onetake.media.publish.entity.PublishStatus;
import com.onetake.media.publish.repository.PublishDestinationRepository;
import com.onetake.media.publish.repository.PublishSessionRepository;
import com.onetake.media.stream.entity.SessionStatus;
import com.onetake.media.stream.entity.StreamSession;
import com.onetake.media.stream.repository.StreamSessionRepository;
import com.onetake.media.publish.integration.CoreDestinationClient;
import com.onetake.media.publish.integration.dto.CoreDestinationDto;
import com.onetake.media.settings.entity.UserMediaSettings;
import com.onetake.media.settings.entity.VideoQuality;
import com.onetake.media.settings.repository.UserMediaSettingsRepository;
import com.onetake.media.stream.service.LiveKitEgressService;
import com.onetake.media.stream.service.LiveKitService;
import livekit.LivekitModels;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublishService {

    private final PublishSessionRepository publishSessionRepository;
    private final PublishDestinationRepository publishDestinationRepository;
    private final StreamSessionRepository streamSessionRepository;
    private final UserMediaSettingsRepository userMediaSettingsRepository;
    private final LiveKitEgressService liveKitEgressService;
    private final LiveKitService liveKitService;
    private final CoreDestinationClient coreDestinationClient;
    private final PublishEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Transactional
    public PublishResponse startPublish(String odUserId, String studioId, PublishStartRequest request) {
        // 이미 송출 중인 세션이 있으면 정리 후 새로 시작 (이중 클릭·끊긴 세션 복구)
        Optional<PublishSession> existingOpt = publishSessionRepository.findByStudioIdAndStatus(
                studioId, PublishStatus.PUBLISHING);
        if (existingOpt.isPresent()) {
            PublishSession existing = existingOpt.get();
            try {
                if (existing.getEgressId() != null) {
                    liveKitEgressService.stopEgress(existing.getEgressId());
                }
            } catch (Exception e) {
                log.debug("기존 egress 중지 실패(무시): egressId={}", existing.getEgressId(), e);
            }
            List<PublishDestination> existingDests = publishDestinationRepository.findByPublishSessionId(existing.getId());
            existingDests.forEach(PublishDestination::markDisconnected);
            publishDestinationRepository.saveAll(existingDests);
            existing.stopPublishing();
            publishSessionRepository.save(existing);
            log.info("기존 송출 세션 정리 후 재시작: studioId={}, publishSessionId={}",
                    studioId, existing.getPublishSessionId());
        }

        // 스트림 세션 확인 (CONNECTING 또는 ACTIVE — 웹훅 지연 시 CONNECTING도 허용)
        StreamSession streamSession = streamSessionRepository
                .findFirstByStudioIdAndStatusInOrderByCreatedAtDesc(
                        studioId,
                        List.of(SessionStatus.CONNECTING, SessionStatus.ACTIVE))
                .orElseThrow(() -> new BusinessException(ErrorCode.STREAM_SESSION_NOT_FOUND));

        // 웹훅 전에 startPublish가 호출된 경우 CONNECTING → ACTIVE로 전환
        if (streamSession.getStatus() == SessionStatus.CONNECTING) {
            streamSession.activate();
        }

        // LiveKit room 존재 및 참가자 확인
        String roomName = streamSession.getRoomName();
        List<LivekitModels.ParticipantInfo> participants = liveKitService.listParticipants(roomName);
        if (participants.isEmpty()) {
            log.warn("No participants in LiveKit room: {}", roomName);
            throw new BusinessException(ErrorCode.LIVEKIT_ROOM_NOT_FOUND);
        }
        log.info("LiveKit room verified: room={}, participants={}", roomName, participants.size());

        // Destination 정보 조회 (core-service 연동, YouTube만 송출)
        List<RtmpDestination> rtmpDestinations = fetchRtmpDestinations(request.getDestinationIds());

        // 송출 세션 생성
        String destinationIdsJson = toJson(request.getDestinationIds());
        String rtmpUrlsJson = toJson(rtmpDestinations.stream()
                .map(RtmpDestination::getRtmpUrl)
                .toList());

        PublishSession publishSession = PublishSession.builder()
                .studioId(studioId)
                .odUserId(odUserId)
                .streamSessionId(streamSession.getId())
                .status(PublishStatus.PENDING)
                .destinationIds(destinationIdsJson)
                .build();

        // 송출 세션 저장
        publishSessionRepository.save(publishSession);

        // RTMP URL 목록 생성 (streamKey 포함)
        List<String> fullRtmpUrls = rtmpDestinations.stream()
                .map(dest -> dest.getRtmpUrl() + dest.getStreamKey())
                .toList();

        // 디버그: 유튜브 연결 실패 시 형식 확인용 (스트림 키는 마스킹)
        for (RtmpDestination d : rtmpDestinations) {
            String key = d.getStreamKey();
            String masked = key.length() <= 4 ? "****" : key.substring(0, 2) + "****" + key.substring(key.length() - 2);
            log.info("RTMP destination: {} -> {} (streamKey length={})",
                    d.getRtmpUrl(), d.getRtmpUrl() + masked, key.length());
        }

        // 사용자 비디오 품질 설정 조회
        VideoQuality videoQuality = userMediaSettingsRepository.findByOdUserId(odUserId)
                .map(UserMediaSettings::getVideoQuality)
                .orElse(VideoQuality.MEDIUM);

        // LiveKit Egress를 통한 RTMP 송출 시작
        String egressId = liveKitEgressService.startRtmpStream(streamSession.getRoomName(), fullRtmpUrls, videoQuality);
        publishSession.startPublishing(egressId, rtmpUrlsJson);

        publishSessionRepository.save(publishSession);

        // PublishDestination 저장
        savePublishDestinations(publishSession, rtmpDestinations);

        log.info("Publishing started: studioId={}, publishSessionId={}, destinations={}",
                studioId, publishSession.getPublishSessionId(), request.getDestinationIds());

        // 송출 시작 이벤트 발행
        eventPublisher.publishStarted(studioId, publishSession.getPublishSessionId());

        return PublishResponse.from(publishSession);
    }

    @Transactional
    public PublishResponse stopPublish(String studioId) {
        PublishSession publishSession = publishSessionRepository
                .findByStudioIdAndStatus(studioId, PublishStatus.PUBLISHING)
                .orElseThrow(() -> new BusinessException(ErrorCode.PUBLISH_NOT_IN_PROGRESS));

        // LiveKit Egress 중지
        liveKitEgressService.stopEgress(publishSession.getEgressId());

        // PublishDestination 상태 업데이트
        List<PublishDestination> destinations = publishDestinationRepository.findByPublishSessionId(publishSession.getId());
        destinations.forEach(PublishDestination::markDisconnected);
        publishDestinationRepository.saveAll(destinations);

        publishSession.stopPublishing();
        publishSessionRepository.save(publishSession);

        log.info("Publishing stopped: studioId={}, publishSessionId={}", studioId, publishSession.getPublishSessionId());

        // 송출 종료 이벤트 발행
        eventPublisher.publishStopped(studioId, publishSession.getPublishSessionId());

        return PublishResponse.from(publishSession);
    }

    public PublishStatusResponse getPublishStatus(String studioId) {
        PublishSession publishSession = publishSessionRepository
                .findByStudioIdAndStatus(studioId, PublishStatus.PUBLISHING)
                .orElseThrow(() -> new BusinessException(ErrorCode.PUBLISH_NOT_IN_PROGRESS));

        // Destination 상태 조회 (TODO: 실제 연결 상태 확인)
        List<PublishStatusResponse.DestinationStatus> destinations = buildDestinationStatuses(publishSession);

        return PublishStatusResponse.of(
                publishSession.getPublishSessionId(),
                publishSession.getStudioId(),
                publishSession.getStatus(),
                destinations,
                publishSession.getStartedAt()
        );
    }

    /**
     * Egress 종료 이벤트 처리 (Webhook에서 호출)
     * YouTube에서 스트림 종료 또는 Egress 오류 발생 시 호출됨
     */
    @Transactional
    public void handleEgressEnded(String egressId, String errorMessage) {
        Optional<PublishSession> optSession = publishSessionRepository.findByEgressId(egressId);

        if (optSession.isEmpty()) {
            log.debug("No publish session found for egressId: {}", egressId);
            return;
        }

        PublishSession publishSession = optSession.get();

        // 이미 종료된 세션은 무시
        if (publishSession.getStatus() != PublishStatus.PUBLISHING) {
            log.debug("Publish session already stopped: egressId={}", egressId);
            return;
        }

        // Destination 상태 업데이트
        List<PublishDestination> destinations = publishDestinationRepository.findByPublishSessionId(publishSession.getId());
        destinations.forEach(PublishDestination::markDisconnected);
        publishDestinationRepository.saveAll(destinations);

        // 세션 상태 업데이트
        if (errorMessage != null && !errorMessage.isEmpty()) {
            publishSession.fail(errorMessage);
            log.warn("Publishing failed via webhook: studioId={}, egressId={}, error={}",
                    publishSession.getStudioId(), egressId, errorMessage);
            // 송출 실패 이벤트 발행
            eventPublisher.publishFailed(publishSession.getStudioId(), publishSession.getPublishSessionId(), errorMessage);
        } else {
            publishSession.stopPublishing();
            log.info("Publishing stopped via webhook: studioId={}, egressId={}",
                    publishSession.getStudioId(), egressId);
            // 외부에서 종료됨 이벤트 발행 (YouTube 등에서 종료)
            eventPublisher.publishEndedExternally(publishSession.getStudioId(), publishSession.getPublishSessionId(),
                    "스트림이 외부에서 종료되었습니다");
        }

        publishSessionRepository.save(publishSession);
    }

    /**
     * 비정상 종료된 세션 정리 (스케줄러에서 호출)
     * 1시간 이상 PUBLISHING 상태인 세션을 강제 종료
     */
    @Transactional
    public int cleanupStaleSessions(int maxHours) {
        LocalDateTime cutoffTime = LocalDateTime.now().minusHours(maxHours);

        List<PublishSession> staleSessions = publishSessionRepository.findAll().stream()
                .filter(s -> s.getStatus() == PublishStatus.PUBLISHING)
                .filter(s -> s.getStartedAt() != null && s.getStartedAt().isBefore(cutoffTime))
                .toList();

        for (PublishSession session : staleSessions) {
            try {
                // Egress 중지 시도 (이미 종료되었을 수 있음)
                if (session.getEgressId() != null) {
                    try {
                        liveKitEgressService.stopEgress(session.getEgressId());
                    } catch (Exception e) {
                        log.debug("Egress already stopped or not found: {}", session.getEgressId());
                    }
                }

                // Destination 상태 업데이트
                List<PublishDestination> destinations = publishDestinationRepository.findByPublishSessionId(session.getId());
                destinations.forEach(PublishDestination::markDisconnected);
                publishDestinationRepository.saveAll(destinations);

                // 세션 강제 종료
                session.fail("Session timeout - cleaned up by scheduler");
                publishSessionRepository.save(session);

                log.info("Stale publish session cleaned up: studioId={}, sessionId={}",
                        session.getStudioId(), session.getPublishSessionId());

            } catch (Exception e) {
                log.error("Failed to cleanup stale session: {}", session.getPublishSessionId(), e);
            }
        }

        return staleSessions.size();
    }

    /**
     * Room 참가자가 없을 때 송출 종료 (participant_left 이벤트에서 호출)
     */
    @Transactional
    public void handleRoomEmpty(String roomName) {
        // roomName에서 studioId 추출 (studio-{id} 형식)
        if (!roomName.startsWith("studio-")) {
            return;
        }

        try {
            String studioId = roomName.substring(7);

            Optional<PublishSession> optSession = publishSessionRepository
                    .findByStudioIdAndStatus(studioId, PublishStatus.PUBLISHING);

            if (optSession.isEmpty()) {
                return;
            }

            PublishSession publishSession = optSession.get();

            // Egress 중지
            if (publishSession.getEgressId() != null) {
                try {
                    liveKitEgressService.stopEgress(publishSession.getEgressId());
                } catch (Exception e) {
                    log.debug("Egress already stopped: {}", publishSession.getEgressId());
                }
            }

            // Destination 상태 업데이트
            List<PublishDestination> destinations = publishDestinationRepository.findByPublishSessionId(publishSession.getId());
            destinations.forEach(PublishDestination::markDisconnected);
            publishDestinationRepository.saveAll(destinations);

            // 세션 종료
            publishSession.stopPublishing();
            publishSessionRepository.save(publishSession);

            log.info("Publishing stopped due to empty room: studioId={}, roomName={}",
                    studioId, roomName);

            // 외부에서 종료됨 이벤트 발행 (참가자 없음)
            eventPublisher.publishEndedExternally(studioId, publishSession.getPublishSessionId(),
                    "모든 참가자가 퇴장하여 스트림이 종료되었습니다");

        } catch (Exception e) {
            log.warn("Invalid room name format: {}", roomName);
        }
    }

    /**
     * core-service에서 연동 채널 정보 조회 후 YouTube만 RTMP 송출 대상으로 사용.
     * RTMP URL/Stream Key가 없거나 platform이 youtube가 아니면 제외.
     */
    private List<RtmpDestination> fetchRtmpDestinations(List<Long> destinationIds) {
        List<CoreDestinationDto> fromCore = coreDestinationClient.getDestinationsByIds(destinationIds);

        List<RtmpDestination> destinations = fromCore.stream()
                .filter(d -> "youtube".equalsIgnoreCase(d.getPlatform()))
                .filter(d -> d.getRtmpUrl() != null && !d.getRtmpUrl().isBlank()
                        && d.getStreamKey() != null && !d.getStreamKey().isBlank())
                .map(d -> new RtmpDestination(
                        d.getId(),
                        d.getPlatform(),
                        normalizeRtmpUrl(d.getRtmpUrl().trim()),
                        d.getStreamKey().trim()  // 복사 시 붙은 공백/줄바꿈 제거 (유튜브 연결 끊김 방지)
                ))
                .collect(Collectors.toList());

        if (destinations.isEmpty()) {
            throw new BusinessException(ErrorCode.PUBLISH_DESTINATION_INVALID);
        }

        return destinations;
    }

    /** YouTube RTMP URL 끝이 /가 아니면 / 붙여서 streamKey와 결합 시 일관성 유지 */
    private static String normalizeRtmpUrl(String rtmpUrl) {
        if (rtmpUrl == null || rtmpUrl.isBlank()) return rtmpUrl;
        String u = rtmpUrl.trim();
        return u.endsWith("/") ? u : u + "/";
    }

    private List<PublishStatusResponse.DestinationStatus> buildDestinationStatuses(PublishSession publishSession) {
        List<PublishDestination> destinations = publishDestinationRepository.findByPublishSessionId(publishSession.getId());

        return destinations.stream()
                .map(dest -> PublishStatusResponse.DestinationStatus.builder()
                        .destinationId(dest.getConnectedDestinationId())
                        .platform(dest.getPlatform())
                        .status(dest.getConnectionStatus().name().toLowerCase())
                        .rtmpUrl(dest.getRtmpUrl())
                        .build())
                .toList();
    }

    private void savePublishDestinations(PublishSession publishSession, List<RtmpDestination> rtmpDestinations) {
        List<PublishDestination> destinations = rtmpDestinations.stream()
                .map(dest -> {
                    PublishDestination publishDestination = PublishDestination.builder()
                            .publishSessionId(publishSession.getId())
                            .connectedDestinationId(dest.getDestinationId())
                            .platform(dest.getPlatform())
                            .rtmpUrl(dest.getRtmpUrl() + dest.getStreamKey())
                            .connectionStatus(PublishDestination.ConnectionStatus.CONNECTING)
                            .build();
                    return publishDestination;
                })
                .toList();

        publishDestinationRepository.saveAll(destinations);

        // 연결 성공으로 상태 변경 (실제로는 callback이나 polling으로 처리)
        destinations.forEach(PublishDestination::markConnected);
        publishDestinationRepository.saveAll(destinations);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.error("Failed to serialize object to JSON", e);
            return "[]";
        }
    }

    // RTMP Destination 내부 클래스
    @lombok.Getter
    @lombok.AllArgsConstructor
    private static class RtmpDestination {
        private Long destinationId;
        private String platform;
        private String rtmpUrl;
        private String streamKey;
    }
}
