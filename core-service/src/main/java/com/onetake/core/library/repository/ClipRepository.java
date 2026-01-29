package com.onetake.core.library.repository;

import com.onetake.core.library.entity.Clip;
import com.onetake.core.library.entity.ClipStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClipRepository extends JpaRepository<Clip, Long> {

    Optional<Clip> findByClipId(String clipId);

    Optional<Clip> findByClipIdAndStatusNot(String clipId, ClipStatus status);

    Page<Clip> findByUserIdAndStatusNotOrderByCreatedAtDesc(String userId, ClipStatus status, Pageable pageable);

    List<Clip> findByRecordingIdAndStatusNotOrderByCreatedAtDesc(Long recordingId, ClipStatus status);

    Optional<Clip> findByAiJobId(String aiJobId);

    @Query("SELECT COALESCE(SUM(c.fileSize), 0) FROM Clip c WHERE c.userId = :userId AND c.status != 'DELETED'")
    Long getTotalFileSizeByUserId(@Param("userId") String userId);

    long countByRecordingIdAndStatusNot(Long recordingId, ClipStatus status);
}
