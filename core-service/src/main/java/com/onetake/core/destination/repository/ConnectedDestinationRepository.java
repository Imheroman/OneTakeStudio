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

    /** 활성 채널만 대상으로 중복 여부 판단 (연결 해제 후 재등록 허용용) */
    boolean existsByUserIdAndPlatformAndChannelIdAndIsActiveTrue(Long userId, String platform, String channelId);

    /** 이미 등록된 활성 채널 조회 (409 대신 200으로 기존 데이터 반환용) */
    Optional<ConnectedDestination> findOneByUserIdAndPlatformAndChannelIdAndIsActiveTrue(Long userId, String platform, String channelId);

    List<ConnectedDestination> findByIdInAndIsActiveTrue(List<Long> ids);
}
