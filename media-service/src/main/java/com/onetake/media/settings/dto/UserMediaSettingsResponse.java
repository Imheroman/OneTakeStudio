package com.onetake.media.settings.dto;

import com.onetake.media.settings.entity.AudioQuality;
import com.onetake.media.settings.entity.UserMediaSettings;
import com.onetake.media.settings.entity.VideoQuality;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserMediaSettingsResponse {

    private String settingsId;
    private Long userId;
    private String defaultVideoDeviceId;
    private VideoQuality videoQuality;
    private String defaultAudioInputDeviceId;
    private String defaultAudioOutputDeviceId;
    private AudioQuality audioQuality;
    private Boolean noiseCancellationEnabled;
    private Boolean echoCancellationEnabled;
    private Integer defaultVolumeLevel;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static UserMediaSettingsResponse from(UserMediaSettings settings) {
        return UserMediaSettingsResponse.builder()
                .settingsId(settings.getSettingsId())
                .userId(settings.getUserId())
                .defaultVideoDeviceId(settings.getDefaultVideoDeviceId())
                .videoQuality(settings.getVideoQuality())
                .defaultAudioInputDeviceId(settings.getDefaultAudioInputDeviceId())
                .defaultAudioOutputDeviceId(settings.getDefaultAudioOutputDeviceId())
                .audioQuality(settings.getAudioQuality())
                .noiseCancellationEnabled(settings.getNoiseCancellationEnabled())
                .echoCancellationEnabled(settings.getEchoCancellationEnabled())
                .defaultVolumeLevel(settings.getDefaultVolumeLevel())
                .createdAt(settings.getCreatedAt())
                .updatedAt(settings.getUpdatedAt())
                .build();
    }
}
