package com.onetake.media.recording.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RecordingStoppedEvent {

    private Long recordingId;
    private String studioId;
    private String odUserId;
    private String filePath;
    private String fileUrl;
    private Long fileSize;
    private Long durationSeconds;
    private String recordingName;
    private String thumbnailUrl;
    private LocalDateTime stoppedAt;
}
