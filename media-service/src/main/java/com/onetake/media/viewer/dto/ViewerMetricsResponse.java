package com.onetake.media.viewer.dto;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.viewer.entity.ViewerMetrics;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewerMetricsResponse {

    private String metricsId;
    private Long studioId;
    private ChatPlatform platform;
    private Long currentViewers;
    private Long peakViewers;
    private LocalDateTime recordedAt;

    public static ViewerMetricsResponse from(ViewerMetrics entity) {
        return ViewerMetricsResponse.builder()
                .metricsId(entity.getMetricsId())
                .studioId(entity.getStudioId())
                .platform(entity.getPlatform())
                .currentViewers(entity.getCurrentViewers())
                .peakViewers(entity.getPeakViewers())
                .recordedAt(entity.getRecordedAt())
                .build();
    }

    public static List<ViewerMetricsResponse> fromList(List<ViewerMetrics> entities) {
        return entities.stream()
                .map(ViewerMetricsResponse::from)
                .toList();
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Aggregated {
        private Long studioId;
        private Long totalViewers;
        private Long totalPeakViewers;
        private List<PlatformMetrics> platforms;
        private LocalDateTime recordedAt;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PlatformMetrics {
        private ChatPlatform platform;
        private Long currentViewers;
        private Long peakViewers;
    }
}
