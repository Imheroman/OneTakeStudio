package com.onetake.media.recording.repository;

import com.onetake.media.recording.entity.RecordingSession;
import com.onetake.media.recording.entity.RecordingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecordingSessionRepository extends JpaRepository<RecordingSession, Long> {

    Optional<RecordingSession> findByRecordingId(String recordingId);

    Optional<RecordingSession> findByStudioIdAndStatus(String studioId, RecordingStatus status);

    Optional<RecordingSession> findByEgressId(String egressId);

    List<RecordingSession> findByStudioIdOrderByCreatedAtDesc(String studioId);

    List<RecordingSession> findByOdUserIdOrderByCreatedAtDesc(String odUserId);

    boolean existsByStudioIdAndStatus(String studioId, RecordingStatus status);

    List<RecordingSession> findByStatus(RecordingStatus status);
}
