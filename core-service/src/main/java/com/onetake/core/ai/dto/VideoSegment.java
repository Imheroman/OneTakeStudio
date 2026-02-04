package com.onetake.core.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * AI 서비스에 전달할 영상 구간 정보
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoSegment {

    private String videoId;        // "short_1", "short_2", ...
    private String videoPath;      // 원본 영상 경로
    private Double startSec;       // 구간 시작 (초)
    private Double endSec;         // 구간 끝 (초)
    private String markerId;       // 연결된 마커 ID (있는 경우)
    private String label;          // 마커 라벨 (있는 경우)
}
