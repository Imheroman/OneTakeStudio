package com.onetake.core.library.repository;

import com.onetake.core.library.entity.Recording;
import com.onetake.core.library.entity.RecordingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecordingRepository extends JpaRepository<Recording, Long> {

    Optional<Recording> findByRecordingId(String recordingId);

    Optional<Recording> findByRecordingIdAndStatusNot(String recordingId, RecordingStatus status);

    Page<Recording> findByUserIdAndStatusNotOrderByCreatedAtDesc(String userId, RecordingStatus status, Pageable pageable);

    Page<Recording> findByStudioIdAndStatusNotOrderByCreatedAtDesc(Long studioId, RecordingStatus status, Pageable pageable);

    List<Recording> findByStudioIdAndStatusNotOrderByCreatedAtDesc(Long studioId, RecordingStatus status);

    Optional<Recording> findByMediaRecordingId(Long mediaRecordingId);

    boolean existsByMediaRecordingId(Long mediaRecordingId);

    @Query("SELECT COALESCE(SUM(r.fileSize), 0) FROM Recording r WHERE r.userId = :userId AND r.status != 'DELETED'")
    Long getTotalFileSizeByUserId(@Param("userId") String userId);
}
