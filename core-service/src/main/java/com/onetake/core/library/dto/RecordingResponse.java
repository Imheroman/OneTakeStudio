package com.onetake.core.library.dto;

import com.onetake.core.library.entity.Recording;
import com.onetake.core.library.entity.RecordingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordingResponse {

    private String recordingId;
    private Long studioId;
    private String userId;
    private String title;
    private String description;
    private String thumbnailUrl;
    private String s3Url;
    private Long fileSize;
    private Integer durationSeconds;
    private RecordingStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RecordingResponse from(Recording recording) {
        return RecordingResponse.builder()
                .recordingId(recording.getRecordingId())
                .studioId(recording.getStudioId())
                .userId(recording.getUserId())
                .title(recording.getTitle())
                .description(recording.getDescription())
                .thumbnailUrl(recording.getThumbnailUrl())
                .s3Url(recording.getS3Url())
                .fileSize(recording.getFileSize())
                .durationSeconds(recording.getDurationSeconds())
                .status(recording.getStatus())
                .createdAt(recording.getCreatedAt())
                .updatedAt(recording.getUpdatedAt())
                .build();
    }
}
