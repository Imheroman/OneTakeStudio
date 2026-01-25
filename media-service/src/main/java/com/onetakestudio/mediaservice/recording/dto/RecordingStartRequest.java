package com.onetakestudio.mediaservice.recording.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecordingStartRequest {

    @NotNull(message = "스튜디오 ID는 필수입니다")
    private Long studioId;

    private String outputFormat; // mp4, webm 등

    private String quality; // 720p, 1080p 등

    private boolean audioOnly;
}
