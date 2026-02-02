package com.onetake.core.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShortsGenerateResponse {

    private String jobId;
    private String status;
    private String message;
}
