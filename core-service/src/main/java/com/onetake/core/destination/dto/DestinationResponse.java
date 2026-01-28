package com.onetake.core.destination.dto;

import com.onetake.core.destination.entity.ConnectedDestination;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class DestinationResponse {

    private Long id;
    private String destinationId;
    private String platform;
    private String channelId;
    private String channelName;
    private String rtmpUrl;
    private String streamKey;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static DestinationResponse from(ConnectedDestination entity) {
        return DestinationResponse.builder()
                .id(entity.getId())
                .destinationId(entity.getDestinationId())
                .platform(entity.getPlatform())
                .channelId(entity.getChannelId())
                .channelName(entity.getChannelName())
                .rtmpUrl(entity.getRtmpUrl())
                .streamKey(entity.getStreamKey())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
