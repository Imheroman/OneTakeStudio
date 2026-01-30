package com.onetake.media.viewer.controller;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.viewer.dto.ViewerMetricsResponse;
import com.onetake.media.viewer.dto.ViewerStatsResponse;
import com.onetake.media.viewer.service.ViewerMetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/media/viewer")
@RequiredArgsConstructor
public class ViewerMetricsController {

    private final ViewerMetricsService viewerMetricsService;

    /**
     * 현재 시청 지표 조회 (모든 플랫폼)
     *
     * GET /api/media/viewer/{studioId}/current
     */
    @GetMapping("/{studioId}/current")
    public ResponseEntity<ApiResponse<List<ViewerMetricsResponse>>> getCurrentMetrics(
            @PathVariable Long studioId) {
        log.info("Get current viewer metrics: studioId={}", studioId);
        List<ViewerMetricsResponse> metrics = viewerMetricsService.getCurrentMetrics(studioId);
        return ResponseEntity.ok(ApiResponse.success(metrics));
    }

    /**
     * 현재 통합 시청 지표 조회
     *
     * GET /api/media/viewer/{studioId}/aggregated
     */
    @GetMapping("/{studioId}/aggregated")
    public ResponseEntity<ApiResponse<ViewerMetricsResponse.Aggregated>> getAggregatedMetrics(
            @PathVariable Long studioId) {
        log.info("Get aggregated viewer metrics: studioId={}", studioId);
        ViewerMetricsResponse.Aggregated aggregated = viewerMetricsService.getCurrentAggregatedMetrics(studioId);
        return ResponseEntity.ok(ApiResponse.success(aggregated));
    }

    /**
     * 플랫폼별 현재 지표 조회
     *
     * GET /api/media/viewer/{studioId}/platform/{platform}
     */
    @GetMapping("/{studioId}/platform/{platform}")
    public ResponseEntity<ApiResponse<ViewerMetricsResponse>> getPlatformMetrics(
            @PathVariable Long studioId,
            @PathVariable ChatPlatform platform) {
        log.info("Get platform viewer metrics: studioId={}, platform={}", studioId, platform);
        ViewerMetricsResponse metrics = viewerMetricsService.getPlatformMetrics(studioId, platform);
        return ResponseEntity.ok(ApiResponse.success(metrics));
    }

    /**
     * 통합 시청자 수 조회
     *
     * GET /api/media/viewer/{studioId}/total
     */
    @GetMapping("/{studioId}/total")
    public ResponseEntity<ApiResponse<Long>> getTotalViewers(@PathVariable Long studioId) {
        log.info("Get total viewers: studioId={}", studioId);
        Long totalViewers = viewerMetricsService.getTotalViewers(studioId);
        return ResponseEntity.ok(ApiResponse.success(totalViewers));
    }

    /**
     * 시간대별 통계 조회
     *
     * GET /api/media/viewer/{studioId}/stats?startTime=2024-01-01T00:00:00&endTime=2024-01-01T23:59:59
     */
    @GetMapping("/{studioId}/stats")
    public ResponseEntity<ApiResponse<ViewerStatsResponse>> getStats(
            @PathVariable Long studioId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.info("Get viewer stats: studioId={}, startTime={}, endTime={}", studioId, startTime, endTime);
        ViewerStatsResponse stats = viewerMetricsService.getStats(studioId, startTime, endTime);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
