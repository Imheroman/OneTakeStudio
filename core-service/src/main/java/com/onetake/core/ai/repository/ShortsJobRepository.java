package com.onetake.core.ai.repository;

import com.onetake.core.ai.entity.ShortsJob;
import com.onetake.core.ai.entity.ShortsJobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShortsJobRepository extends JpaRepository<ShortsJob, Long> {

    Optional<ShortsJob> findByJobId(String jobId);

    List<ShortsJob> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<ShortsJob> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, ShortsJobStatus status);

    Optional<ShortsJob> findTopByUserIdOrderByCreatedAtDesc(Long userId);
}
