package com.onetake.media.stream.repository;

import com.onetake.media.stream.entity.SessionStatus;
import com.onetake.media.stream.entity.StreamSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StreamSessionRepository extends JpaRepository<StreamSession, Long> {

    Optional<StreamSession> findBySessionId(String sessionId);

    Optional<StreamSession> findByRoomName(String roomName);

    Optional<StreamSession> findByStudioIdAndStatus(String studioId, SessionStatus status);

    Optional<StreamSession> findFirstByStudioIdAndStatusInOrderByCreatedAtDesc(String studioId, List<SessionStatus> statuses);

    Optional<StreamSession> findByStudioIdAndOdUserIdAndStatusIn(String studioId, String odUserId, List<SessionStatus> statuses);

    List<StreamSession> findByStudioId(String studioId);

    List<StreamSession> findByOdUserIdAndStatus(String odUserId, SessionStatus status);

    boolean existsByStudioIdAndStatus(String studioId, SessionStatus status);
}
