package com.onetake.media.settings.dto;

import com.onetake.media.settings.entity.SessionMediaState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionMediaStateResponse {

    private String stateId;
    private Long streamSessionId;
    private String odUserId;
    private String studioId;
    private Boolean videoEnabled;
    private Boolean audioEnabled;
    private String currentVideoDeviceId;
    private String currentAudioInputDeviceId;
    private String currentAudioOutputDeviceId;
    private Integer currentVolumeLevel;
    private Boolean isMuted;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SessionMediaStateResponse from(SessionMediaState state) {
        return SessionMediaStateResponse.builder()
                .stateId(state.getStateId())
                .streamSessionId(state.getStreamSessionId())
                .odUserId(state.getOdUserId())
                .studioId(state.getStudioId())
                .videoEnabled(state.getVideoEnabled())
                .audioEnabled(state.getAudioEnabled())
                .currentVideoDeviceId(state.getCurrentVideoDeviceId())
                .currentAudioInputDeviceId(state.getCurrentAudioInputDeviceId())
                .currentAudioOutputDeviceId(state.getCurrentAudioOutputDeviceId())
                .currentVolumeLevel(state.getCurrentVolumeLevel())
                .isMuted(state.getIsMuted())
                .isActive(state.getIsActive())
                .createdAt(state.getCreatedAt())
                .updatedAt(state.getUpdatedAt())
                .build();
    }
}
