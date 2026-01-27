package com.onetake.media.recording.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RecordingStoppedEvent {

    private Long recordingId;
    private Long studioId;
    private Long userId;
    private String s3Key;
    private String s3Url;
    private Long fileSize;
    private Long durationSeconds;
    private LocalDateTime stoppedAt;
}
