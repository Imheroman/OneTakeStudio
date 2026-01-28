package com.onetake.core.destination.dto;

import com.onetake.core.destination.entity.ConnectedDestination;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DestinationResponse {

    private String destinationId;
    private String platform;
    private String channelId;
    private String channelName;
    private String streamUrl;
    private String streamKey;
    private Boolean isActive;

    public static DestinationResponse from(ConnectedDestination destination) {
        return DestinationResponse.builder()
                .destinationId(destination.getDestinationId())
                .platform(destination.getPlatform())
                .channelId(destination.getChannelId())
                .channelName(destination.getChannelName())
                .streamUrl(destination.getRtmpUrl())
                .streamKey(destination.getStreamKey())
                .isActive(destination.getIsActive())
                .build();
    }
}
