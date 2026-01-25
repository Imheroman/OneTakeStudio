package com.onetake.core.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CheckUsernameResponse {

    private boolean available;
    private String reason;

    public static CheckUsernameResponse available() {
        return CheckUsernameResponse.builder()
                .available(true)
                .reason("AVAILABLE")
                .build();
    }

    public static CheckUsernameResponse invalidFormat() {
        return CheckUsernameResponse.builder()
                .available(false)
                .reason("INVALID_FORMAT")
                .build();
    }

    public static CheckUsernameResponse duplicated() {
        return CheckUsernameResponse.builder()
                .available(false)
                .reason("DUPLICATED")
                .build();
    }
}
