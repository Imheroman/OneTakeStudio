package com.onetake.media.chat.dto;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.chat.entity.CommentStats;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 분당 댓글 수 조회 응답 DTO
 * 라이브러리 그래프 시각화 및 AI 하이라이트 추출에 사용
 */
@Getter
@Builder
public class CommentCountsResponse {

    /**
     * 녹화 ID
     */
    private Long recordingId;

    /**
     * 스튜디오 ID
     */
    private Long studioId;

    /**
     * 총 방송 시간 (분)
     */
    private Integer durationMinutes;

    /**
     * 분당 댓글 수 배열
     * 인덱스 = 분 (0분, 1분, 2분, ...)
     */
    private List<Integer> counts;

    /**
     * 총 댓글 수
     */
    private Integer totalCount;

    /**
     * Entity → DTO 변환
     */
    public static CommentCountsResponse from(CommentStats stats) {
        List<Integer> counts = parseCountsJson(stats.getCountsJson());

        return CommentCountsResponse.builder()
                .recordingId(stats.getRecordingId())
                .studioId(stats.getStudioId())
                .durationMinutes(stats.getDurationMinutes())
                .counts(counts)
                .totalCount(stats.getTotalCount())
                .build();
    }

    private static List<Integer> parseCountsJson(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(json, new TypeReference<List<Integer>>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }
}
