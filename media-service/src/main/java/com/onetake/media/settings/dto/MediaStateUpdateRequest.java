package com.onetake.media.settings.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaStateUpdateRequest {

    @NotNull
    private Long studioId;

    private Boolean videoEnabled;

    private Boolean audioEnabled;

    private String currentVideoDeviceId;

    private String currentAudioInputDeviceId;

    private String currentAudioOutputDeviceId;

    @Min(0)
    @Max(100)
    private Integer currentVolumeLevel;

    private Boolean isMuted;
}
