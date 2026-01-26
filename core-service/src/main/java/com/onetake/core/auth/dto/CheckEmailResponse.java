package com.onetake.core.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CheckEmailResponse {

    private boolean available;
    private String reason;

    public static CheckEmailResponse available() {
        return CheckEmailResponse.builder()
                .available(true)
                .reason("AVAILABLE")
                .build();
    }

    public static CheckEmailResponse invalidFormat() {
        return CheckEmailResponse.builder()
                .available(false)
                .reason("INVALID_FORMAT")
                .build();
    }

    public static CheckEmailResponse duplicated() {
        return CheckEmailResponse.builder()
                .available(false)
                .reason("DUPLICATED")
                .build();
    }
}
