package com.onetake.core.studio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CreateBannerRequest {

    @NotBlank(message = "배너 텍스트는 필수입니다")
    @Size(max = 500, message = "배너 텍스트는 500자 이하여야 합니다")
    private String text;

    private Integer timerSeconds;

    private Boolean isTicker;
}
