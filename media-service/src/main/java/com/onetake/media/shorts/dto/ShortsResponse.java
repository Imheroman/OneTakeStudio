package com.onetake.media.shorts.dto;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.shorts.entity.ShortsJob;
import com.onetake.media.shorts.entity.ShortsStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 숏츠 작업 응답 DTO
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShortsResponse {

    /**
     * 작업 ID
     */
    private String jobId;

    /**
     * 녹화 ID
     */
    private Long recordingId;

    /**
     * 스튜디오 ID
     */
    private Long studioId;

    /**
     * 작업 상태
     */
    private ShortsStatus status;

    /**
     * 생성된 숏츠 URL
     */
    private String outputUrl;

    /**
     * 숏츠 길이 (초)
     */
    private Double durationSec;

    /**
     * 하이라이트 시작 시간 (초)
     */
    private Double highlightStartSec;

    /**
     * 하이라이트 종료 시간 (초)
     */
    private Double highlightEndSec;

    /**
     * 하이라이트 추출 이유
     */
    private String highlightReason;

    /**
     * AI 추천 제목
     */
    private List<String> titles;

    /**
     * 에러 메시지 (실패 시)
     */
    private String errorMessage;

    /**
     * 요청 시각
     */
    private LocalDateTime createdAt;

    /**
     * 완료 시각
     */
    private LocalDateTime completedAt;

    /**
     * Entity → DTO 변환
     */
    public static ShortsResponse from(ShortsJob job) {
        return ShortsResponse.builder()
                .jobId(job.getJobId())
                .recordingId(job.getRecordingId())
                .studioId(job.getStudioId())
                .status(job.getStatus())
                .outputUrl(job.getOutputUrl())
                .durationSec(job.getDurationSec())
                .highlightStartSec(job.getHighlightStartSec())
                .highlightEndSec(job.getHighlightEndSec())
                .highlightReason(job.getHighlightReason())
                .titles(parseTitlesJson(job.getTitlesJson()))
                .errorMessage(job.getErrorMessage())
                .createdAt(job.getCreatedAt())
                .completedAt(job.getCompletedAt())
                .build();
    }

    private static List<String> parseTitlesJson(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }
}
