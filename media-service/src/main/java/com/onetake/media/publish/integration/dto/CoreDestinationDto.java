package com.onetake.media.publish.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * core-service DestinationResponse와 매핑되는 DTO.
 * POST /api/destinations/internal/batch 응답의 data 항목 요소.
 */
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CoreDestinationDto {

    private Long id;
    private String platform;
    private String rtmpUrl;
    private String streamKey;
}
