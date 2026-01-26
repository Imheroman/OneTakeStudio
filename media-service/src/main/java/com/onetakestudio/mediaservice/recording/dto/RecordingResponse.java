package com.onetakestudio.mediaservice.recording.dto;

import com.onetakestudio.mediaservice.recording.entity.RecordingSession;
import com.onetakestudio.mediaservice.recording.entity.RecordingStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RecordingResponse {

    private String recordingId;
    private Long studioId;
    private Long userId;
    private RecordingStatus status;
    private String fileName;
    private String s3Url;
    private Long fileSize;
    private Long durationSeconds;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime createdAt;
    private String errorMessage;

    public static RecordingResponse from(RecordingSession session) {
        return RecordingResponse.builder()
                .recordingId(session.getRecordingId())
                .studioId(session.getStudioId())
                .userId(session.getUserId())
                .status(session.getStatus())
                .fileName(session.getFileName())
                .s3Url(session.getS3Url())
                .fileSize(session.getFileSize())
                .durationSeconds(session.getDurationSeconds())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .createdAt(session.getCreatedAt())
                .errorMessage(session.getErrorMessage())
                .build();
    }
}
