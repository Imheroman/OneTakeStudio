package com.onetake.media.screenshare.repository;

import com.onetake.media.screenshare.entity.ScreenShareSession;
import com.onetake.media.screenshare.entity.ScreenShareStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScreenShareSessionRepository extends JpaRepository<ScreenShareSession, Long> {

    Optional<ScreenShareSession> findByShareId(String shareId);

    Optional<ScreenShareSession> findByStudioIdAndStatus(Long studioId, ScreenShareStatus status);

    List<ScreenShareSession> findByStudioIdOrderByCreatedAtDesc(Long studioId);

    boolean existsByStudioIdAndStatus(Long studioId, ScreenShareStatus status);
}
