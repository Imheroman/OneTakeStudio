package com.onetake.core.ai.repository;

import com.onetake.core.ai.entity.ShortsJob;
import com.onetake.core.ai.entity.ShortsResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShortsResultRepository extends JpaRepository<ShortsResult, Long> {

    List<ShortsResult> findByJobOrderByCreatedAtAsc(ShortsJob job);

    Optional<ShortsResult> findByResultId(String resultId);

    Optional<ShortsResult> findByJobAndVideoId(ShortsJob job, String videoId);

    @Query("SELECT r FROM ShortsResult r WHERE r.job.recordingId = :recordingId AND r.saved = true ORDER BY r.createdAt ASC")
    List<ShortsResult> findSavedByRecordingId(@Param("recordingId") String recordingId);
}
