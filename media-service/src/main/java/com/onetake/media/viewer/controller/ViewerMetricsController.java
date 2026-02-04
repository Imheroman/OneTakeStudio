package com.onetake.media.viewer.controller;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.global.resolver.StudioIdResolver;
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
    private final StudioIdResolver studioIdResolver;

    /**
     * 현재 시청 지표 조회 (모든 플랫폼)
     *
     * GET /api/media/viewer/{studioId}/current
     */
    @GetMapping("/{studioId}/current")
    public ResponseEntity<ApiResponse<List<ViewerMetricsResponse>>> getCurrentMetrics(
            @PathVariable String studioId) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        log.info("Get current viewer metrics: studioId={}", resolvedStudioId);
        List<ViewerMetricsResponse> metrics = viewerMetricsService.getCurrentMetrics(resolvedStudioId);
        return ResponseEntity.ok(ApiResponse.success(metrics));
    }

    /**
     * 현재 통합 시청 지표 조회
     *
     * GET /api/media/viewer/{studioId}/aggregated
     */
    @GetMapping("/{studioId}/aggregated")
    public ResponseEntity<ApiResponse<ViewerMetricsResponse.Aggregated>> getAggregatedMetrics(
            @PathVariable String studioId) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        log.info("Get aggregated viewer metrics: studioId={}", resolvedStudioId);
        ViewerMetricsResponse.Aggregated aggregated = viewerMetricsService.getCurrentAggregatedMetrics(resolvedStudioId);
        return ResponseEntity.ok(ApiResponse.success(aggregated));
    }

    /**
     * 플랫폼별 현재 지표 조회
     *
     * GET /api/media/viewer/{studioId}/platform/{platform}
     */
    @GetMapping("/{studioId}/platform/{platform}")
    public ResponseEntity<ApiResponse<ViewerMetricsResponse>> getPlatformMetrics(
            @PathVariable String studioId,
            @PathVariable ChatPlatform platform) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        log.info("Get platform viewer metrics: studioId={}, platform={}", resolvedStudioId, platform);
        ViewerMetricsResponse metrics = viewerMetricsService.getPlatformMetrics(resolvedStudioId, platform);
        return ResponseEntity.ok(ApiResponse.success(metrics));
    }

    /**
     * 통합 시청자 수 조회
     *
     * GET /api/media/viewer/{studioId}/total
     */
    @GetMapping("/{studioId}/total")
    public ResponseEntity<ApiResponse<Long>> getTotalViewers(@PathVariable String studioId) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        log.info("Get total viewers: studioId={}", resolvedStudioId);
        Long totalViewers = viewerMetricsService.getTotalViewers(resolvedStudioId);
        return ResponseEntity.ok(ApiResponse.success(totalViewers));
    }

    /**
     * 시간대별 통계 조회
     *
     * GET /api/media/viewer/{studioId}/stats?startTime=2024-01-01T00:00:00&endTime=2024-01-01T23:59:59
     */
    @GetMapping("/{studioId}/stats")
    public ResponseEntity<ApiResponse<ViewerStatsResponse>> getStats(
            @PathVariable String studioId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        log.info("Get viewer stats: studioId={}, startTime={}, endTime={}", resolvedStudioId, startTime, endTime);
        ViewerStatsResponse stats = viewerMetricsService.getStats(resolvedStudioId, startTime, endTime);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
