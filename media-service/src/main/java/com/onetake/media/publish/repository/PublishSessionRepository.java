package com.onetake.media.publish.repository;

import com.onetake.media.publish.entity.PublishSession;
import com.onetake.media.publish.entity.PublishStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PublishSessionRepository extends JpaRepository<PublishSession, Long> {

    Optional<PublishSession> findByPublishSessionId(String publishSessionId);

    Optional<PublishSession> findByStudioIdAndStatus(String studioId, PublishStatus status);

    List<PublishSession> findByStudioIdOrderByCreatedAtDesc(String studioId);

    Optional<PublishSession> findByEgressId(String egressId);
}
