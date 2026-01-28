package com.onetake.core.destination.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateDestinationRequest {

    private String channelName;
    private String rtmpUrl;
    private String streamKey;
}
