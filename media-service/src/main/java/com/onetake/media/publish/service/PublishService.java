package com.onetake.media.publish.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import com.onetake.media.publish.dto.PublishResponse;
import com.onetake.media.publish.dto.PublishStartRequest;
import com.onetake.media.publish.dto.PublishStatusResponse;
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
import com.onetake.media.stream.service.LiveKitEgressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublishService {

    private final PublishSessionRepository publishSessionRepository;
    private final PublishDestinationRepository publishDestinationRepository;
    private final StreamSessionRepository streamSessionRepository;
    private final LiveKitEgressService liveKitEgressService;
    private final CoreDestinationClient coreDestinationClient;
    private final ObjectMapper objectMapper;

    @Transactional
    public PublishResponse startPublish(Long userId, PublishStartRequest request) {
        // 이미 송출 중인지 확인
        if (publishSessionRepository.findByStudioIdAndStatus(request.getStudioId(), PublishStatus.PUBLISHING).isPresent()) {
            throw new BusinessException(ErrorCode.PUBLISH_ALREADY_IN_PROGRESS);
        }

        // 활성 스트림 세션 확인
        StreamSession streamSession = streamSessionRepository
                .findByStudioIdAndStatus(request.getStudioId(), SessionStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.STREAM_SESSION_NOT_FOUND));

        // Destination 정보 조회 (core-service 연동, YouTube만 송출)
        List<RtmpDestination> rtmpDestinations = fetchRtmpDestinations(request.getDestinationIds());

        // 송출 세션 생성
        String destinationIdsJson = toJson(request.getDestinationIds());
        String rtmpUrlsJson = toJson(rtmpDestinations.stream()
                .map(RtmpDestination::getRtmpUrl)
                .toList());

        PublishSession publishSession = PublishSession.builder()
                .studioId(request.getStudioId())
                .userId(userId)
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

        // LiveKit Egress를 통한 RTMP 송출 시작
        String egressId = liveKitEgressService.startRtmpStream(streamSession.getRoomName(), fullRtmpUrls);
        publishSession.startPublishing(egressId, rtmpUrlsJson);

        publishSessionRepository.save(publishSession);

        // PublishDestination 저장
        savePublishDestinations(publishSession, rtmpDestinations);

        log.info("Publishing started: studioId={}, publishSessionId={}, destinations={}",
                request.getStudioId(), publishSession.getPublishSessionId(), request.getDestinationIds());

        return PublishResponse.from(publishSession);
    }

    @Transactional
    public PublishResponse stopPublish(Long studioId) {
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

        return PublishResponse.from(publishSession);
    }

    public PublishStatusResponse getPublishStatus(Long studioId) {
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
                        normalizeRtmpUrl(d.getRtmpUrl()),
                        d.getStreamKey()
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
        return rtmpUrl.endsWith("/") ? rtmpUrl : rtmpUrl + "/";
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
