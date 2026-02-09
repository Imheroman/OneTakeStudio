package com.onetake.media.viewer.dto;

import com.onetake.media.chat.entity.ChatPlatform;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewerStatsResponse {

    private String studioId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long averageViewers;
    private Long peakViewers;
    private Long totalDataPoints;
    private List<TimeSeriesData> timeSeries;
    private Map<ChatPlatform, PlatformStats> platformStats;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TimeSeriesData {
        private LocalDateTime timestamp;
        private Long totalViewers;
        private Map<ChatPlatform, Long> byPlatform;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PlatformStats {
        private ChatPlatform platform;
        private Long averageViewers;
        private Long peakViewers;
        private Long dataPoints;
    }
}
