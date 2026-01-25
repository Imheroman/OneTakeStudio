package com.onetakestudio.mediaservice.publish.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetakestudio.mediaservice.global.exception.BusinessException;
import com.onetakestudio.mediaservice.global.exception.ErrorCode;
import com.onetakestudio.mediaservice.publish.dto.PublishResponse;
import com.onetakestudio.mediaservice.publish.dto.PublishStartRequest;
import com.onetakestudio.mediaservice.publish.dto.PublishStatusResponse;
import com.onetakestudio.mediaservice.publish.entity.PublishSession;
import com.onetakestudio.mediaservice.publish.entity.PublishStatus;
import com.onetakestudio.mediaservice.publish.repository.PublishSessionRepository;
import com.onetakestudio.mediaservice.stream.entity.SessionStatus;
import com.onetakestudio.mediaservice.stream.entity.StreamSession;
import com.onetakestudio.mediaservice.stream.repository.StreamSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublishService {

    private final PublishSessionRepository publishSessionRepository;
    private final StreamSessionRepository streamSessionRepository;
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

        // Destination 정보 조회 (TODO: Destination Service 연동)
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

        // LiveKit Egress를 통한 RTMP 송출 시작
        String egressId = startLiveKitRtmpEgress(streamSession.getRoomName(), rtmpDestinations);
        publishSession.startPublishing(egressId, rtmpUrlsJson);

        publishSessionRepository.save(publishSession);

        log.info("Publishing started: studioId={}, publishId={}, destinations={}",
                request.getStudioId(), publishSession.getId(), request.getDestinationIds());

        return PublishResponse.from(publishSession);
    }

    @Transactional
    public PublishResponse stopPublish(Long studioId) {
        PublishSession publishSession = publishSessionRepository
                .findByStudioIdAndStatus(studioId, PublishStatus.PUBLISHING)
                .orElseThrow(() -> new BusinessException(ErrorCode.PUBLISH_NOT_IN_PROGRESS));

        // LiveKit Egress 중지
        stopLiveKitEgress(publishSession.getLivekitEgressId());

        publishSession.stopPublishing();
        publishSessionRepository.save(publishSession);

        log.info("Publishing stopped: studioId={}, publishId={}", studioId, publishSession.getId());

        return PublishResponse.from(publishSession);
    }

    public PublishStatusResponse getPublishStatus(Long studioId) {
        PublishSession publishSession = publishSessionRepository
                .findByStudioIdAndStatus(studioId, PublishStatus.PUBLISHING)
                .orElseThrow(() -> new BusinessException(ErrorCode.PUBLISH_NOT_IN_PROGRESS));

        // Destination 상태 조회 (TODO: 실제 연결 상태 확인)
        List<PublishStatusResponse.DestinationStatus> destinations = buildDestinationStatuses(publishSession);

        return PublishStatusResponse.of(
                publishSession.getId(),
                publishSession.getStudioId(),
                publishSession.getStatus(),
                destinations,
                publishSession.getStartedAt()
        );
    }

    private List<RtmpDestination> fetchRtmpDestinations(List<Long> destinationIds) {
        // TODO: Destination Service를 통해 실제 RTMP URL/Stream Key 조회
        // 현재는 시뮬레이션 데이터 반환
        List<RtmpDestination> destinations = new ArrayList<>();
        for (Long destinationId : destinationIds) {
            destinations.add(new RtmpDestination(
                    destinationId,
                    "youtube", // platform
                    "rtmp://a.rtmp.youtube.com/live2/", // rtmpUrl
                    "dummy-stream-key-" + destinationId // streamKey
            ));
        }
        return destinations;
    }

    private List<PublishStatusResponse.DestinationStatus> buildDestinationStatuses(PublishSession publishSession) {
        // TODO: 실제 Destination 상태 조회
        List<PublishStatusResponse.DestinationStatus> statuses = new ArrayList<>();
        statuses.add(PublishStatusResponse.DestinationStatus.builder()
                .destinationId(1L)
                .platform("youtube")
                .status("connected")
                .rtmpUrl("rtmp://a.rtmp.youtube.com/live2/")
                .build());
        return statuses;
    }

    private String startLiveKitRtmpEgress(String roomName, List<RtmpDestination> destinations) {
        // TODO: LiveKit Egress RTMP API 연동
        // RoomCompositeEgressRequest with StreamOutput (RTMP)
        // 여러 destination을 동시에 송출 가능
        log.info("Starting LiveKit RTMP Egress for room: {}, destinations: {}", roomName, destinations.size());

        // LiveKit Egress RTMP 설정 예시:
        // EncodedFileOutput output = new EncodedFileOutput.Builder()
        //     .setFileType(EncodedFileType.MP4)
        //     .addStreamOutputs(streamOutputs)
        //     .build();
        //
        // RoomCompositeEgressRequest request = new RoomCompositeEgressRequest.Builder(roomName)
        //     .setOutput(output)
        //     .build();

        return "egress-rtmp-" + UUID.randomUUID();
    }

    private void stopLiveKitEgress(String egressId) {
        // TODO: LiveKit Egress API 연동
        // StopEgress를 호출하여 송출 중지
        log.info("Stopping LiveKit Egress: {}", egressId);
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
