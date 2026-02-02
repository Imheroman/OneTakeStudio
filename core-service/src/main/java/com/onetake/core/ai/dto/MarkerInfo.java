package com.onetake.core.ai.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Media Service에서 받아오는 마커 정보
 */
@Getter
@NoArgsConstructor
public class MarkerInfo {

    private String markerId;
    private Long studioId;
    private String recordingId;
    private Double timestampSec;
    private String source;
    private String label;
    private Double chatSpikeRatio;
}
