package com.onetake.media.chat.repository;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.PlatformToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformTokenRepository extends JpaRepository<PlatformToken, Long> {

    Optional<PlatformToken> findByUserIdAndPlatform(Long userId, ChatPlatform platform);

    List<PlatformToken> findByUserId(Long userId);

    List<PlatformToken> findByStudioIdAndPlatform(Long studioId, ChatPlatform platform);

    void deleteByUserIdAndPlatform(Long userId, ChatPlatform platform);

    boolean existsByUserIdAndPlatform(Long userId, ChatPlatform platform);
}
