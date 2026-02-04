package com.onetake.core.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShortsStatusResponse {

    private String jobId;
    private String status;  // pending, processing, completed, error
    private int totalCount;
    private int completedCount;
    private List<ShortItem> shorts;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ShortItem {
        private String videoId;
        private String status;
        private String outputPath;
        private String thumbnailPath;
        private Double durationSec;
        private String resolution;
        private Boolean hasSubtitles;
        private HighlightInfo highlight;
        private List<String> titles;
        private Double processingTimeSec;
        private String error;
        private Integer currentStep;
        private Integer totalSteps;
        private String currentStepKey;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class HighlightInfo {
        private Double startSec;
        private Double endSec;
        private String reason;
    }
}
