package com.onetake.core.destination.repository;

import com.onetake.core.destination.entity.ConnectedDestination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectedDestinationRepository extends JpaRepository<ConnectedDestination, Long> {

    Optional<ConnectedDestination> findByDestinationId(String destinationId);

    List<ConnectedDestination> findByUserIdAndIsActiveTrue(Long userId);

    List<ConnectedDestination> findByUserIdAndPlatform(Long userId, String platform);

    Optional<ConnectedDestination> findByUserIdAndPlatformAndChannelId(Long userId, String platform, String channelId);

    boolean existsByUserIdAndPlatformAndChannelId(Long userId, String platform, String channelId);

    List<ConnectedDestination> findByIdInAndIsActiveTrue(List<Long> ids);
}
