package com.onetake.media.viewer.service;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import com.onetake.media.viewer.dto.ViewerMetricsResponse;
import com.onetake.media.viewer.dto.ViewerStatsResponse;
import com.onetake.media.viewer.entity.ViewerMetrics;
import com.onetake.media.viewer.repository.ViewerMetricsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ViewerMetricsService {

    private final ViewerMetricsRepository viewerMetricsRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 시청자 지표 저장 및 브로드캐스트
     */
    @Transactional
    public ViewerMetrics saveAndBroadcast(String studioId, ChatPlatform platform, Long currentViewers) {
        // 기존 peak 조회
        Long existingPeak = viewerMetricsRepository
                .findMaxPeakViewersByStudioIdAndPlatform(studioId, platform)
                .orElse(0L);

        Long peakViewers = Math.max(existingPeak, currentViewers);

        ViewerMetrics metrics = ViewerMetrics.builder()
                .studioId(studioId)
                .platform(platform)
                .currentViewers(currentViewers)
                .peakViewers(peakViewers)
                .recordedAt(LocalDateTime.now())
                .build();

        ViewerMetrics saved = viewerMetricsRepository.save(metrics);
        log.debug("Viewer metrics saved: studioId={}, platform={}, viewers={}",
                studioId, platform, currentViewers);

        // WebSocket 브로드캐스트
        broadcastMetrics(studioId);

        return saved;
    }

    /**
     * 스튜디오의 현재 통합 지표 브로드캐스트
     */
    public void broadcastMetrics(String studioId) {
        ViewerMetricsResponse.Aggregated aggregated = getCurrentAggregatedMetrics(studioId);
        messagingTemplate.convertAndSend(
                "/topic/metrics/" + studioId,
                aggregated
        );
        log.debug("Broadcasted viewer metrics to /topic/metrics/{}", studioId);
    }

    /**
     * 현재 시청 지표 조회 (모든 플랫폼)
     */
    @Transactional(readOnly = true)
    public List<ViewerMetricsResponse> getCurrentMetrics(String studioId) {
        List<ViewerMetrics> latestMetrics = viewerMetricsRepository
                .findLatestByStudioIdGroupByPlatform(studioId);
        return ViewerMetricsResponse.fromList(latestMetrics);
    }

    /**
     * 현재 통합 지표 조회
     */
    @Transactional(readOnly = true)
    public ViewerMetricsResponse.Aggregated getCurrentAggregatedMetrics(String studioId) {
        List<ViewerMetrics> latestMetrics = viewerMetricsRepository
                .findLatestByStudioIdGroupByPlatform(studioId);

        long totalViewers = latestMetrics.stream()
                .mapToLong(ViewerMetrics::getCurrentViewers)
                .sum();

        long totalPeak = latestMetrics.stream()
                .mapToLong(ViewerMetrics::getPeakViewers)
                .sum();

        List<ViewerMetricsResponse.PlatformMetrics> platformMetrics = latestMetrics.stream()
                .map(m -> ViewerMetricsResponse.PlatformMetrics.builder()
                        .platform(m.getPlatform())
                        .currentViewers(m.getCurrentViewers())
                        .peakViewers(m.getPeakViewers())
                        .build())
                .toList();

        LocalDateTime latestTime = latestMetrics.stream()
                .map(ViewerMetrics::getRecordedAt)
                .max(LocalDateTime::compareTo)
                .orElse(LocalDateTime.now());

        return ViewerMetricsResponse.Aggregated.builder()
                .studioId(studioId)
                .totalViewers(totalViewers)
                .totalPeakViewers(totalPeak)
                .platforms(platformMetrics)
                .recordedAt(latestTime)
                .build();
    }

    /**
     * 플랫폼별 현재 지표 조회
     */
    @Transactional(readOnly = true)
    public ViewerMetricsResponse getPlatformMetrics(String studioId, ChatPlatform platform) {
        ViewerMetrics metrics = viewerMetricsRepository
                .findTopByStudioIdAndPlatformOrderByRecordedAtDesc(studioId, platform)
                .orElseThrow(() -> new BusinessException(ErrorCode.VIEWER_METRICS_NOT_FOUND));
        return ViewerMetricsResponse.from(metrics);
    }

    /**
     * 통합 시청자 수 조회
     */
    @Transactional(readOnly = true)
    public Long getTotalViewers(String studioId) {
        return viewerMetricsRepository.sumCurrentViewersByStudioId(studioId);
    }

    /**
     * 시간대별 통계 조회
     */
    @Transactional(readOnly = true)
    public ViewerStatsResponse getStats(String studioId, LocalDateTime startTime, LocalDateTime endTime) {
        List<ViewerMetrics> metricsInRange = viewerMetricsRepository
                .findByStudioIdAndRecordedAtBetweenOrderByRecordedAtAsc(studioId, startTime, endTime);

        if (metricsInRange.isEmpty()) {
            return ViewerStatsResponse.builder()
                    .studioId(studioId)
                    .startTime(startTime)
                    .endTime(endTime)
                    .averageViewers(0L)
                    .peakViewers(0L)
                    .totalDataPoints(0L)
                    .timeSeries(List.of())
                    .platformStats(Map.of())
                    .build();
        }

        // 플랫폼별 통계 계산
        Map<ChatPlatform, ViewerStatsResponse.PlatformStats> platformStats = calculatePlatformStats(metricsInRange);

        // 시계열 데이터 생성
        List<ViewerStatsResponse.TimeSeriesData> timeSeries = buildTimeSeries(metricsInRange);

        // 전체 평균 및 피크 계산
        long totalAvg = metricsInRange.stream()
                .mapToLong(ViewerMetrics::getCurrentViewers)
                .sum() / metricsInRange.size();

        long totalPeak = metricsInRange.stream()
                .mapToLong(ViewerMetrics::getPeakViewers)
                .max()
                .orElse(0L);

        return ViewerStatsResponse.builder()
                .studioId(studioId)
                .startTime(startTime)
                .endTime(endTime)
                .averageViewers(totalAvg)
                .peakViewers(totalPeak)
                .totalDataPoints((long) metricsInRange.size())
                .timeSeries(timeSeries)
                .platformStats(platformStats)
                .build();
    }

    private Map<ChatPlatform, ViewerStatsResponse.PlatformStats> calculatePlatformStats(
            List<ViewerMetrics> metrics) {
        return metrics.stream()
                .collect(Collectors.groupingBy(ViewerMetrics::getPlatform))
                .entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> {
                            List<ViewerMetrics> platformMetrics = e.getValue();
                            long avg = platformMetrics.stream()
                                    .mapToLong(ViewerMetrics::getCurrentViewers)
                                    .sum() / platformMetrics.size();
                            long peak = platformMetrics.stream()
                                    .mapToLong(ViewerMetrics::getPeakViewers)
                                    .max()
                                    .orElse(0L);
                            return ViewerStatsResponse.PlatformStats.builder()
                                    .platform(e.getKey())
                                    .averageViewers(avg)
                                    .peakViewers(peak)
                                    .dataPoints((long) platformMetrics.size())
                                    .build();
                        }
                ));
    }

    private List<ViewerStatsResponse.TimeSeriesData> buildTimeSeries(List<ViewerMetrics> metrics) {
        // 같은 시간대의 데이터를 그룹화
        Map<LocalDateTime, List<ViewerMetrics>> byTime = metrics.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getRecordedAt().withSecond(0).withNano(0),
                        TreeMap::new,
                        Collectors.toList()
                ));

        return byTime.entrySet().stream()
                .map(e -> {
                    long total = e.getValue().stream()
                            .mapToLong(ViewerMetrics::getCurrentViewers)
                            .sum();
                    Map<ChatPlatform, Long> byPlatform = e.getValue().stream()
                            .collect(Collectors.toMap(
                                    ViewerMetrics::getPlatform,
                                    ViewerMetrics::getCurrentViewers,
                                    Long::sum
                            ));
                    return ViewerStatsResponse.TimeSeriesData.builder()
                            .timestamp(e.getKey())
                            .totalViewers(total)
                            .byPlatform(byPlatform)
                            .build();
                })
                .toList();
    }

    /**
     * 오래된 지표 데이터 삭제 (정리용)
     */
    @Transactional
    public void cleanupOldMetrics(String studioId, LocalDateTime before) {
        viewerMetricsRepository.deleteByStudioIdAndRecordedAtBefore(studioId, before);
        log.info("Cleaned up viewer metrics before {} for studioId={}", before, studioId);
    }
}
