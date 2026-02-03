package com.onetake.media.shorts.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI 서버 콜백 DTO (AI → Backend)
 *
 * POST /api/callback/ai-result
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiCallbackRequest {

    /**
     * 작업 ID
     */
    @JsonProperty("job_id")
    private String jobId;

    /**
     * 영상 ID
     */
    @JsonProperty("video_id")
    private String videoId;

    /**
     * 처리 상태 (success, failed)
     */
    private String status;

    /**
     * 결과 데이터 (성공 시)
     */
    private ResultData data;

    /**
     * 에러 메시지 (실패 시)
     */
    private String error;

    /**
     * 결과 데이터
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResultData {

        /**
         * 생성된 숏츠 정보
         */
        @JsonProperty("short")
        private ShortInfo shortInfo;

        /**
         * 하이라이트 구간 정보
         */
        private HighlightInfo highlight;

        /**
         * AI 추천 제목 (3개)
         */
        private List<String> titles;
    }

    /**
     * 숏츠 파일 정보
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ShortInfo {

        /**
         * 파일 경로
         */
        @JsonProperty("file_path")
        private String filePath;

        /**
         * 영상 길이 (초)
         */
        @JsonProperty("duration_sec")
        private Double durationSec;

        /**
         * 자막 포함 여부
         */
        @JsonProperty("has_subtitles")
        private Boolean hasSubtitles;
    }

    /**
     * 하이라이트 구간 정보
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class HighlightInfo {

        /**
         * 시작 시간 (초)
         */
        @JsonProperty("start_sec")
        private Double startSec;

        /**
         * 종료 시간 (초)
         */
        @JsonProperty("end_sec")
        private Double endSec;

        /**
         * 하이라이트 선정 이유
         */
        private String reason;
    }
}
