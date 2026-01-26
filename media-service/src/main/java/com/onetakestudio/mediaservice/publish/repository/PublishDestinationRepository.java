package com.onetakestudio.mediaservice.publish.repository;

import com.onetakestudio.mediaservice.publish.entity.PublishDestination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PublishDestinationRepository extends JpaRepository<PublishDestination, Long> {

    Optional<PublishDestination> findByPublishDestinationId(String publishDestinationId);

    List<PublishDestination> findByPublishSessionId(Long publishSessionId);

    List<PublishDestination> findByPublishSessionIdAndConnectionStatus(
            Long publishSessionId,
            PublishDestination.ConnectionStatus connectionStatus
    );

    List<PublishDestination> findByConnectedDestinationId(Long connectedDestinationId);
}
