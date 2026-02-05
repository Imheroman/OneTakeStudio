package com.onetake.media.chat.repository;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.PlatformToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformTokenRepository extends JpaRepository<PlatformToken, Long> {

    Optional<PlatformToken> findByOdUserIdAndPlatform(String odUserId, ChatPlatform platform);

    List<PlatformToken> findByOdUserId(String odUserId);

    List<PlatformToken> findByStudioIdAndPlatform(String studioId, ChatPlatform platform);

    void deleteByOdUserIdAndPlatform(String odUserId, ChatPlatform platform);

    boolean existsByOdUserIdAndPlatform(String odUserId, ChatPlatform platform);
}
