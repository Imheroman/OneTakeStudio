package com.onetake.media.marker.repository;

import com.onetake.media.marker.entity.Marker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MarkerRepository extends JpaRepository<Marker, Long> {

    Optional<Marker> findByMarkerId(String markerId);

    List<Marker> findByStudioIdOrderByTimestampSecAsc(String studioId);

    List<Marker> findByRecordingIdOrderByTimestampSecAsc(String recordingId);

    /**
     * 쇼츠 생성에 사용되지 않은 마커 중 상위 N개 조회
     * (채팅 급증률 또는 최신순)
     */
    @Query("SELECT m FROM Marker m WHERE m.recordingId = :recordingId AND m.usedForShorts = false " +
           "ORDER BY COALESCE(m.chatSpikeRatio, 0) DESC, m.timestampSec ASC")
    List<Marker> findTopUnusedMarkers(@Param("recordingId") String recordingId);

    /**
     * 특정 시간 범위 내 마커 조회
     */
    @Query("SELECT m FROM Marker m WHERE m.studioId = :studioId " +
           "AND m.timestampSec BETWEEN :startSec AND :endSec")
    List<Marker> findByStudioIdAndTimestampRange(
            @Param("studioId") String studioId,
            @Param("startSec") Double startSec,
            @Param("endSec") Double endSec);
}
