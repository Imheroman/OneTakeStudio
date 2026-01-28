package com.onetake.core.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class OAuthCodeRequest {

    @NotBlank(message = "Authorization code는 필수입니다.")
    private String code;

    private String redirectUri;
}
