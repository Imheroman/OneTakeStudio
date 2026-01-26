package com.onetakestudio.mediaservice.screenshare.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScreenShareStartRequest {

    @NotNull(message = "스튜디오 ID는 필수입니다")
    private Long studioId;

    private String sourceType; // "screen", "window", "tab"
}
