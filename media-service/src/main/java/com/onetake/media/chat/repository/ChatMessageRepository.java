package com.onetake.media.chat.repository;

import com.onetake.media.chat.entity.ChatMessage;
import com.onetake.media.chat.entity.ChatPlatform;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    Optional<ChatMessage> findByMessageId(String messageId);

    List<ChatMessage> findByStudioIdAndIsDeletedFalseOrderByCreatedAtDesc(String studioId);

    Page<ChatMessage> findByStudioIdAndIsDeletedFalseOrderByCreatedAtDesc(String studioId, Pageable pageable);

    List<ChatMessage> findByStudioIdAndPlatformAndIsDeletedFalseOrderByCreatedAtDesc(
            String studioId, ChatPlatform platform);

    @Query("SELECT c FROM ChatMessage c WHERE c.studioId = :studioId " +
           "AND c.createdAt >= :since AND c.isDeleted = false ORDER BY c.createdAt ASC")
    List<ChatMessage> findRecentMessages(
            @Param("studioId") String studioId,
            @Param("since") LocalDateTime since);

    @Query("SELECT c FROM ChatMessage c WHERE c.studioId = :studioId " +
           "AND c.isHighlighted = true AND c.isDeleted = false ORDER BY c.createdAt DESC")
    List<ChatMessage> findHighlightedMessages(@Param("studioId") String studioId);

    @Query("SELECT COUNT(c) FROM ChatMessage c WHERE c.studioId = :studioId " +
           "AND c.createdAt >= :since AND c.isDeleted = false")
    Long countMessagesSince(@Param("studioId") String studioId, @Param("since") LocalDateTime since);

    @Query("SELECT c.platform, COUNT(c) FROM ChatMessage c WHERE c.studioId = :studioId " +
           "AND c.isDeleted = false GROUP BY c.platform")
    List<Object[]> countByPlatform(@Param("studioId") String studioId);

    boolean existsByExternalMessageId(String externalMessageId);
}
