package com.onetake.core.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {

    private String accessToken;
    private String refreshToken;
    private UserDto user;

    @Getter
    @Builder
    public static class UserDto {
        private Long userId;
        private String username;
        private String nickname;
        private String profileImageUrl;
    }
}
