package com.onetake.media.screenshare.dto;

import com.onetake.media.screenshare.entity.ScreenShareSession;
import com.onetake.media.screenshare.entity.ScreenShareStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ScreenShareResponse {

    private Long id;
    private String shareId;
    private String studioId;
    private Long userId;
    private ScreenShareStatus status;
    private String sourceType;
    private String trackId;
    private LocalDateTime startedAt;
    private LocalDateTime stoppedAt;

    public static ScreenShareResponse from(ScreenShareSession session) {
        return ScreenShareResponse.builder()
                .id(session.getId())
                .shareId(session.getShareId())
                .studioId(session.getStudioId())
                .userId(session.getUserId())
                .status(session.getStatus())
                .sourceType(session.getSourceType())
                .trackId(session.getTrackId())
                .startedAt(session.getStartedAt())
                .stoppedAt(session.getStoppedAt())
                .build();
    }
}
