package com.onetake.media.viewer.repository;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.viewer.entity.ViewerMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ViewerMetricsRepository extends JpaRepository<ViewerMetrics, Long> {

    Optional<ViewerMetrics> findByMetricsId(String metricsId);

    List<ViewerMetrics> findByStudioIdOrderByRecordedAtDesc(String studioId);

    Optional<ViewerMetrics> findTopByStudioIdAndPlatformOrderByRecordedAtDesc(String studioId, ChatPlatform platform);

    List<ViewerMetrics> findByStudioIdAndRecordedAtBetweenOrderByRecordedAtAsc(
            String studioId, LocalDateTime start, LocalDateTime end);

    List<ViewerMetrics> findByStudioIdAndPlatformAndRecordedAtBetweenOrderByRecordedAtAsc(
            String studioId, ChatPlatform platform, LocalDateTime start, LocalDateTime end);

    @Query("SELECT v FROM ViewerMetrics v WHERE v.studioId = :studioId " +
            "AND v.recordedAt = (SELECT MAX(v2.recordedAt) FROM ViewerMetrics v2 " +
            "WHERE v2.studioId = :studioId AND v2.platform = v.platform)")
    List<ViewerMetrics> findLatestByStudioIdGroupByPlatform(@Param("studioId") String studioId);

    @Query("SELECT MAX(v.peakViewers) FROM ViewerMetrics v WHERE v.studioId = :studioId AND v.platform = :platform")
    Optional<Long> findMaxPeakViewersByStudioIdAndPlatform(
            @Param("studioId") String studioId, @Param("platform") ChatPlatform platform);

    @Query("SELECT COALESCE(SUM(v.currentViewers), 0) FROM ViewerMetrics v " +
            "WHERE v.studioId = :studioId " +
            "AND v.recordedAt = (SELECT MAX(v2.recordedAt) FROM ViewerMetrics v2 " +
            "WHERE v2.studioId = :studioId AND v2.platform = v.platform)")
    Long sumCurrentViewersByStudioId(@Param("studioId") String studioId);

    void deleteByStudioIdAndRecordedAtBefore(String studioId, LocalDateTime before);
}
