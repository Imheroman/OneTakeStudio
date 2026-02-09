package com.onetake.media.publish.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * core-service ApiResponse&lt;List&lt;DestinationResponse&gt;&gt;와 매핑되는 DTO.
 * POST /api/destinations/internal/batch 응답.
 */
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CoreDestinationBatchResponse {

    private boolean success;
    private String message;
    private List<CoreDestinationDto> data;
}
