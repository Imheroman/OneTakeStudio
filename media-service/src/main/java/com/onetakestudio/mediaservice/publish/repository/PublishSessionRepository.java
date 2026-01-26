package com.onetakestudio.mediaservice.publish.repository;

import com.onetakestudio.mediaservice.publish.entity.PublishSession;
import com.onetakestudio.mediaservice.publish.entity.PublishStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PublishSessionRepository extends JpaRepository<PublishSession, Long> {

    Optional<PublishSession> findByPublishSessionId(String publishSessionId);

    Optional<PublishSession> findByStudioIdAndStatus(Long studioId, PublishStatus status);

    List<PublishSession> findByStudioIdOrderByCreatedAtDesc(Long studioId);

    Optional<PublishSession> findByEgressId(String egressId);
}
