package com.onetake.media.settings.entity;

import com.onetake.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "user_media_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserMediaSettings extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "settings_id", unique = true, nullable = false, updatable = false, length = 36)
    private String settingsId;

    @Column(name = "user_id", unique = true, nullable = false)
    private Long userId;

    @Column(name = "default_video_device_id")
    private String defaultVideoDeviceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "video_quality", length = 20)
    @Builder.Default
    private VideoQuality videoQuality = VideoQuality.HIGH;

    @Column(name = "default_audio_input_device_id")
    private String defaultAudioInputDeviceId;

    @Column(name = "default_audio_output_device_id")
    private String defaultAudioOutputDeviceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "audio_quality", length = 20)
    @Builder.Default
    private AudioQuality audioQuality = AudioQuality.HIGH;

    @Column(name = "noise_cancellation_enabled")
    @Builder.Default
    private Boolean noiseCancellationEnabled = true;

    @Column(name = "echo_cancellation_enabled")
    @Builder.Default
    private Boolean echoCancellationEnabled = true;

    @Column(name = "default_volume_level")
    @Builder.Default
    private Integer defaultVolumeLevel = 80;

    public void updateSettings(String defaultVideoDeviceId, VideoQuality videoQuality,
                               String defaultAudioInputDeviceId, String defaultAudioOutputDeviceId,
                               AudioQuality audioQuality, Boolean noiseCancellationEnabled,
                               Boolean echoCancellationEnabled, Integer defaultVolumeLevel) {
        if (defaultVideoDeviceId != null) this.defaultVideoDeviceId = defaultVideoDeviceId;
        if (videoQuality != null) this.videoQuality = videoQuality;
        if (defaultAudioInputDeviceId != null) this.defaultAudioInputDeviceId = defaultAudioInputDeviceId;
        if (defaultAudioOutputDeviceId != null) this.defaultAudioOutputDeviceId = defaultAudioOutputDeviceId;
        if (audioQuality != null) this.audioQuality = audioQuality;
        if (noiseCancellationEnabled != null) this.noiseCancellationEnabled = noiseCancellationEnabled;
        if (echoCancellationEnabled != null) this.echoCancellationEnabled = echoCancellationEnabled;
        if (defaultVolumeLevel != null) this.defaultVolumeLevel = defaultVolumeLevel;
    }

    @PrePersist
    public void prePersist() {
        if (this.settingsId == null) {
            this.settingsId = UUID.randomUUID().toString();
        }
    }
}
