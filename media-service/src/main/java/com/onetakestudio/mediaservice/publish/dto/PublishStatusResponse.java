package com.onetakestudio.mediaservice.publish.dto;

import com.onetakestudio.mediaservice.publish.entity.PublishStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class PublishStatusResponse {

    private Long publishId;
    private Long studioId;
    private PublishStatus status;
    private List<DestinationStatus> destinations;
    private LocalDateTime startedAt;
    private Long durationSeconds; // 송출 경과 시간 (초)

    @Getter
    @Builder
    public static class DestinationStatus {
        private Long destinationId;
        private String platform; // "youtube", "twitch", "chzzk"
        private String status; // "connected", "disconnected", "error"
        private String rtmpUrl;
    }

    public static PublishStatusResponse of(Long publishId, Long studioId, PublishStatus status,
                                            List<DestinationStatus> destinations,
                                            LocalDateTime startedAt) {
        Long durationSeconds = null;
        if (startedAt != null) {
            durationSeconds = java.time.Duration.between(startedAt, LocalDateTime.now()).getSeconds();
        }

        return PublishStatusResponse.builder()
                .publishId(publishId)
                .studioId(studioId)
                .status(status)
                .destinations(destinations)
                .startedAt(startedAt)
                .durationSeconds(durationSeconds)
                .build();
    }
}
