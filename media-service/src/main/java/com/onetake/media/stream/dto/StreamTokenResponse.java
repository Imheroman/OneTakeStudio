package com.onetake.media.stream.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StreamTokenResponse {

    private String token;
    private String roomName;
    private String participantIdentity;
    private String livekitUrl;
}
