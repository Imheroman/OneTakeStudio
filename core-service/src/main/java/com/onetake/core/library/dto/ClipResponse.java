package com.onetake.core.library.dto;

import com.onetake.core.library.entity.Clip;
import com.onetake.core.library.entity.ClipSourceType;
import com.onetake.core.library.entity.ClipStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClipResponse {

    private String clipId;
    private Long recordingId;
    private String userId;
    private String title;
    private String description;
    private String thumbnailUrl;
    private String s3Url;
    private Long fileSize;
    private Integer durationSeconds;
    private Integer startTime;
    private Integer endTime;
    private ClipStatus status;
    private ClipSourceType sourceType;
    private String subtitleUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ClipResponse from(Clip clip) {
        return ClipResponse.builder()
                .clipId(clip.getClipId())
                .recordingId(clip.getRecordingId())
                .userId(clip.getUserId())
                .title(clip.getTitle())
                .description(clip.getDescription())
                .thumbnailUrl(clip.getThumbnailUrl())
                .s3Url(clip.getS3Url())
                .fileSize(clip.getFileSize())
                .durationSeconds(clip.getDurationSeconds())
                .startTime(clip.getStartTime())
                .endTime(clip.getEndTime())
                .status(clip.getStatus())
                .sourceType(clip.getSourceType())
                .subtitleUrl(clip.getSubtitleUrl())
                .createdAt(clip.getCreatedAt())
                .updatedAt(clip.getUpdatedAt())
                .build();
    }
}
