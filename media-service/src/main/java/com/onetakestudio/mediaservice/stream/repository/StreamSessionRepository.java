package com.onetakestudio.mediaservice.stream.repository;

import com.onetakestudio.mediaservice.stream.entity.SessionStatus;
import com.onetakestudio.mediaservice.stream.entity.StreamSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StreamSessionRepository extends JpaRepository<StreamSession, Long> {

    Optional<StreamSession> findBySessionId(String sessionId);

    Optional<StreamSession> findByRoomName(String roomName);

    Optional<StreamSession> findByStudioIdAndStatus(Long studioId, SessionStatus status);

    List<StreamSession> findByStudioId(Long studioId);

    List<StreamSession> findByUserIdAndStatus(Long userId, SessionStatus status);

    boolean existsByStudioIdAndStatus(Long studioId, SessionStatus status);
}
