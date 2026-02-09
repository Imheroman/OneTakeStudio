package com.onetake.core.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ShortsGenerateRequest {

    @NotBlank(message = "녹화 ID는 필수입니다")
    private String recordingId;

    private boolean needSubtitles = true;

    private String subtitleLang = "ko";

    private String bgColor = "black";

    private Double trimStartSec;

    private Double trimEndSec;
}
