package com.onetake.media.publish.dto;

import com.onetake.media.publish.entity.PublishStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class PublishStatusResponse {

    private String publishSessionId;
    private Long studioId;
    private PublishStatus status;
    private List<DestinationStatus> destinations;
    private LocalDateTime startedAt;
    private Long durationSeconds; // 송출 경과 시간 (초)

    @Getter
    @Builder
    public static class DestinationStatus {
        private Long destinationId;
        private String platform; // "youtube", "chzzk"
        private String status; // "connected", "disconnected", "error"
        private String rtmpUrl;
    }

    public static PublishStatusResponse of(String publishSessionId, Long studioId, PublishStatus status,
                                            List<DestinationStatus> destinations,
                                            LocalDateTime startedAt) {
        Long durationSeconds = null;
        if (startedAt != null) {
            durationSeconds = java.time.Duration.between(startedAt, LocalDateTime.now()).getSeconds();
        }

        return PublishStatusResponse.builder()
                .publishSessionId(publishSessionId)
                .studioId(studioId)
                .status(status)
                .destinations(destinations)
                .startedAt(startedAt)
                .durationSeconds(durationSeconds)
                .build();
    }
}
