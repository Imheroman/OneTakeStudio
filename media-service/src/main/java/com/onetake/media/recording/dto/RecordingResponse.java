package com.onetake.media.recording.dto;

import com.onetake.media.recording.entity.RecordingSession;
import com.onetake.media.recording.entity.RecordingStatus;
import com.onetake.media.recording.entity.UploadStatus;
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
    private String filePath;
    private String fileUrl;
    private Long fileSize;
    private Long durationSeconds;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime createdAt;
    private String errorMessage;

    // 외부 EC2 업로드 상태
    private UploadStatus externalUploadStatus;
    private String externalFileUrl;
    private LocalDateTime externalUploadedAt;

    public static RecordingResponse from(RecordingSession session) {
        return RecordingResponse.builder()
                .recordingId(session.getRecordingId())
                .studioId(session.getStudioId())
                .userId(session.getUserId())
                .status(session.getStatus())
                .fileName(session.getFileName())
                .filePath(session.getFilePath())
                .fileUrl(session.getFileUrl())
                .fileSize(session.getFileSize())
                .durationSeconds(session.getDurationSeconds())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .createdAt(session.getCreatedAt())
                .errorMessage(session.getErrorMessage())
                .externalUploadStatus(session.getExternalUploadStatus())
                .externalFileUrl(session.getExternalFileUrl())
                .externalUploadedAt(session.getExternalUploadedAt())
                .build();
    }
}
