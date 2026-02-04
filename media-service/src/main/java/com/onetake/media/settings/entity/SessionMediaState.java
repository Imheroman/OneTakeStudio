package com.onetake.media.settings.entity;

import com.onetake.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "session_media_states",
        uniqueConstraints = @UniqueConstraint(columnNames = {"studio_id", "user_id", "is_active"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SessionMediaState extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "state_id", unique = true, nullable = false, updatable = false, length = 36)
    private String stateId;

    @Column(name = "stream_session_id")
    private Long streamSessionId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "studio_id", nullable = false)
    private String studioId;

    @Column(name = "video_enabled")
    @Builder.Default
    private Boolean videoEnabled = true;

    @Column(name = "audio_enabled")
    @Builder.Default
    private Boolean audioEnabled = true;

    @Column(name = "current_video_device_id")
    private String currentVideoDeviceId;

    @Column(name = "current_audio_input_device_id")
    private String currentAudioInputDeviceId;

    @Column(name = "current_audio_output_device_id")
    private String currentAudioOutputDeviceId;

    @Column(name = "current_volume_level")
    @Builder.Default
    private Integer currentVolumeLevel = 80;

    @Column(name = "is_muted")
    @Builder.Default
    private Boolean isMuted = false;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    public void toggleVideo() {
        this.videoEnabled = !this.videoEnabled;
    }

    public void toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
    }

    public void toggleMute() {
        this.isMuted = !this.isMuted;
    }

    public void updateState(Boolean videoEnabled, Boolean audioEnabled,
                            String currentVideoDeviceId, String currentAudioInputDeviceId,
                            String currentAudioOutputDeviceId, Integer currentVolumeLevel, Boolean isMuted) {
        if (videoEnabled != null) this.videoEnabled = videoEnabled;
        if (audioEnabled != null) this.audioEnabled = audioEnabled;
        if (currentVideoDeviceId != null) this.currentVideoDeviceId = currentVideoDeviceId;
        if (currentAudioInputDeviceId != null) this.currentAudioInputDeviceId = currentAudioInputDeviceId;
        if (currentAudioOutputDeviceId != null) this.currentAudioOutputDeviceId = currentAudioOutputDeviceId;
        if (currentVolumeLevel != null) this.currentVolumeLevel = currentVolumeLevel;
        if (isMuted != null) this.isMuted = isMuted;
    }

    public void deactivate() {
        this.isActive = false;
    }

    @PrePersist
    public void prePersist() {
        if (this.stateId == null) {
            this.stateId = UUID.randomUUID().toString();
        }
    }
}
