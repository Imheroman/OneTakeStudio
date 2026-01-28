package com.onetake.core.destination.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateDestinationRequest {

    @NotBlank(message = "플랫폼은 필수입니다")
    private String platform;

    @NotBlank(message = "채널 ID는 필수입니다")
    private String channelId;

    private String channelName;
    private String rtmpUrl;
    private String streamKey;
}
