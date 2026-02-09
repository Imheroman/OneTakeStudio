package com.onetake.media.settings.dto;

import com.onetake.media.settings.entity.AudioQuality;
import com.onetake.media.settings.entity.VideoQuality;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserMediaSettingsRequest {

    private String defaultVideoDeviceId;

    private VideoQuality videoQuality;

    private String defaultAudioInputDeviceId;

    private String defaultAudioOutputDeviceId;

    private AudioQuality audioQuality;

    private Boolean noiseCancellationEnabled;

    private Boolean echoCancellationEnabled;

    @Min(0)
    @Max(100)
    private Integer defaultVolumeLevel;
}
