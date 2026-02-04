package com.onetake.media.shorts.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI 서버 숏츠 생성 요청 DTO (Backend → AI)
 *
 * POST /shorts/process
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiShortsRequest {

    /**
     * 작업 고유 ID
     * 형식: job_{yyyyMMdd}_{seq}
     */
    @JsonProperty("job_id")
    private String jobId;

    /**
     * 처리할 영상 목록
     */
    private List<VideoInfo> videos;

    /**
     * 분당 댓글 수 배열
     * AI가 하이라이트 구간 선정에 활용
     */
    @JsonProperty("comment_counts_per_minute")
    private List<Integer> commentCountsPerMinute;

    /**
     * 자막 필요 여부
     */
    @JsonProperty("need_subtitles")
    private Boolean needSubtitles;

    /**
     * 자막 언어
     */
    @JsonProperty("subtitle_lang")
    private String subtitleLang;

    /**
     * 출력 디렉토리
     */
    @JsonProperty("output_dir")
    private String outputDir;

    /**
     * 결과 수신 웹훅 URL
     */
    @JsonProperty("webhook_url")
    private String webhookUrl;

    /**
     * 영상 정보
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VideoInfo {

        /**
         * 영상 ID
         */
        @JsonProperty("video_id")
        private String videoId;

        /**
         * 영상 파일 경로
         */
        @JsonProperty("video_path")
        private String videoPath;
    }
}
