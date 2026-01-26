package com.onetakestudio.mediaservice.recording.repository;

import com.onetakestudio.mediaservice.recording.entity.RecordingSession;
import com.onetakestudio.mediaservice.recording.entity.RecordingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecordingSessionRepository extends JpaRepository<RecordingSession, Long> {

    Optional<RecordingSession> findByStudioIdAndStatus(Long studioId, RecordingStatus status);

    Optional<RecordingSession> findByLivekitEgressId(String livekitEgressId);

    List<RecordingSession> findByStudioIdOrderByCreatedAtDesc(Long studioId);

    List<RecordingSession> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByStudioIdAndStatus(Long studioId, RecordingStatus status);

    List<RecordingSession> findByStatus(RecordingStatus status);
}
