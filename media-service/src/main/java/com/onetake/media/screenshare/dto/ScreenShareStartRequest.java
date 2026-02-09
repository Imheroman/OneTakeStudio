package com.onetake.media.screenshare.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScreenShareStartRequest {

    @NotBlank(message = "스튜디오 ID는 필수입니다")
    private String studioId;

    private String sourceType; // "screen", "window", "tab"
}
