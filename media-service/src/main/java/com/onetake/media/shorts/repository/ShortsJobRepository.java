package com.onetake.media.shorts.repository;

import com.onetake.media.shorts.entity.ShortsJob;
import com.onetake.media.shorts.entity.ShortsStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShortsJobRepository extends JpaRepository<ShortsJob, Long> {

    /**
     * jobId로 조회
     */
    Optional<ShortsJob> findByJobId(String jobId);

    /**
     * 녹화 ID로 조회 (최신순)
     */
    List<ShortsJob> findByRecordingIdOrderByCreatedAtDesc(Long recordingId);

    /**
     * 스튜디오별 조회 (최신순)
     */
    List<ShortsJob> findByStudioIdOrderByCreatedAtDesc(String studioId);

    /**
     * 사용자별 조회 (최신순)
     */
    List<ShortsJob> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 상태별 조회
     */
    List<ShortsJob> findByStatus(ShortsStatus status);

    /**
     * 녹화에 진행 중인 작업이 있는지 확인
     */
    boolean existsByRecordingIdAndStatusIn(Long recordingId, List<ShortsStatus> statuses);
}
