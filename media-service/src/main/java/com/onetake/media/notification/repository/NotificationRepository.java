package com.onetake.media.notification.repository;

import com.onetake.media.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * 사용자별 알림 목록 조회 (최신순)
     */
    List<Notification> findByOdUserIdOrderByCreatedAtDesc(String odUserId);

    /**
     * 사용자별 읽지 않은 알림 개수
     */
    long countByOdUserIdAndIsReadFalse(String odUserId);

    /**
     * 사용자의 모든 알림 읽음 처리
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.odUserId = :userId AND n.isRead = false")
    int markAllAsRead(@Param("userId") String userId);
}
