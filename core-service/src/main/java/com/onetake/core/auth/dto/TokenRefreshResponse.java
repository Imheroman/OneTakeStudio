package com.onetake.core.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TokenRefreshResponse {

    private String accessToken;
    private String refreshToken;
}
