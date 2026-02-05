package com.onetake.media.settings.repository;

import com.onetake.media.settings.entity.SessionMediaState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionMediaStateRepository extends JpaRepository<SessionMediaState, Long> {

    Optional<SessionMediaState> findByStateId(String stateId);

    Optional<SessionMediaState> findByStudioIdAndOdUserIdAndIsActiveTrue(String studioId, String odUserId);

    List<SessionMediaState> findByStudioIdAndIsActiveTrue(String studioId);

    Optional<SessionMediaState> findByStreamSessionIdAndIsActiveTrue(Long streamSessionId);

    boolean existsByStudioIdAndOdUserIdAndIsActiveTrue(String studioId, String odUserId);
}
