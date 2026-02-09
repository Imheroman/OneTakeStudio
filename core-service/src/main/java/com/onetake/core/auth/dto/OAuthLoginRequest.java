package com.onetake.core.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class OAuthLoginRequest {

    @NotBlank(message = "Access Token은 필수입니다.")
    private String accessToken;
}
