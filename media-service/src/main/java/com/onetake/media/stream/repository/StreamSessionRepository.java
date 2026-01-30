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

    Optional<StreamSession> findByStudioIdAndStatus(Long studioId, SessionStatus status);

    Optional<StreamSession> findByStudioIdAndUserIdAndStatusIn(Long studioId, Long userId, List<SessionStatus> statuses);

    List<StreamSession> findByStudioId(Long studioId);

    List<StreamSession> findByUserIdAndStatus(Long userId, SessionStatus status);

    boolean existsByStudioIdAndStatus(Long studioId, SessionStatus status);
}
