package com.onetake.core.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.Map;

/**
 * AI 서비스에서 보내는 Webhook 페이로드
 */
@Getter
@NoArgsConstructor
@ToString
public class AiWebhookPayload {

    @JsonProperty("job_id")
    private String jobId;

    @JsonProperty("video_id")
    private String videoId;

    private String status;  // completed, error

    private Map<String, Object> result;

    private String error;

    @JsonProperty("processing_time_sec")
    private Double processingTimeSec;

    // summary 타입일 때
    private String type;

    @JsonProperty("total_processing_time_sec")
    private Double totalProcessingTimeSec;

    @JsonProperty("completed_at")
    private String completedAt;
}
