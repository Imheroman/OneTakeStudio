package com.onetake.core.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.List;

/**
 * AI 서비스에서 보내는 Webhook 페이로드
 * API 명세서 기준
 */
@Getter
@NoArgsConstructor
@ToString
public class AiWebhookPayload {

    @JsonProperty("job_id")
    private String jobId;

    @JsonProperty("video_id")
    private String videoId;

    private String status;  // success/completed, error

    private String message;  // 에러 시 메시지
    private String error;    // 에러 메시지 (AI api.py 호환)

    private AiResultData data;    // API 명세서 형식
    private AiResultData result;  // AI api.py 형식 (호환)

    private String type;  // "summary" 타입일 때

    @JsonProperty("processing_time_sec")
    private Double processingTimeSec;

    @JsonProperty("total_processing_time_sec")
    private Double totalProcessingTimeSec;

    // Progress 관련 필드
    private Integer step;

    @JsonProperty("total_steps")
    private Integer totalSteps;

    @JsonProperty("step_key")
    private String stepKey;

    /**
     * progress 상태 여부
     */
    public boolean isProgress() {
        return "progress".equals(status);
    }

    /**
     * data 또는 result 중 있는 것을 반환 (호환용)
     */
    public AiResultData getResultData() {
        return data != null ? data : result;
    }

    /**
     * 에러 메시지 반환 (message 또는 error)
     */
    public String getErrorMessage() {
        return message != null ? message : error;
    }

    /**
     * 성공 여부 (success 또는 completed)
     */
    public boolean isSuccess() {
        return "success".equals(status) || "completed".equals(status);
    }

    /**
     * AI 결과 데이터 구조
     */
    @Getter
    @NoArgsConstructor
    @ToString
    public static class AiResultData {

        @JsonProperty("video_id")
        private String videoId;

        @JsonProperty("short")
        private ShortInfo shortInfo;

        private HighlightInfo highlight;

        private List<String> titles;
    }

    /**
     * 생성된 숏츠 정보
     */
    @Getter
    @NoArgsConstructor
    @ToString
    public static class ShortInfo {

        @JsonProperty("file_path")
        private String filePath;

        @JsonProperty("duration_sec")
        private Double durationSec;

        private String resolution;

        @JsonProperty("has_subtitles")
        private Boolean hasSubtitles;
    }

    /**
     * 하이라이트 구간 정보
     */
    @Getter
    @NoArgsConstructor
    @ToString
    public static class HighlightInfo {

        @JsonProperty("start_sec")
        private Double startSec;

        @JsonProperty("end_sec")
        private Double endSec;

        private String reason;
    }
}
