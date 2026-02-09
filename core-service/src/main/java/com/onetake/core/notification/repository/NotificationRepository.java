package com.onetake.core.notification.repository;

import com.onetake.core.notification.entity.Notification;
import com.onetake.core.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByUserOrderByCreatedAtDesc(User user);

    List<Notification> findAllByUserAndIsReadFalseOrderByCreatedAtDesc(User user);

    Optional<Notification> findByNotificationId(String notificationId);

    Optional<Notification> findByReferenceId(String referenceId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.referenceId = :referenceId")
    void deleteByReferenceId(@Param("referenceId") String referenceId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.notificationId = :notificationId AND n.user = :user")
    int deleteByNotificationIdAndUser(@Param("notificationId") String notificationId, @Param("user") User user);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user = :user")
    void deleteAllByUser(@Param("user") User user);
}
