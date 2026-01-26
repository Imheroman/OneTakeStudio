package com.onetake.core.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class OAuthUserInfo {
    private String provider;
    private String providerId;
    private String email;
    private String nickname;
    private String profileImageUrl;
}
