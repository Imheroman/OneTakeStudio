package com.onetake.media.shorts.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 숏츠 생성 요청 DTO (클라이언트 → Backend)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShortsCreateRequest {

    /**
     * 녹화 ID
     */
    private Long recordingId;

    /**
     * 자막 필요 여부
     */
    @Builder.Default
    private Boolean needSubtitles = true;

    /**
     * 자막 언어 (ko, en, ja, zh)
     */
    @Builder.Default
    private String subtitleLang = "ko";
}
