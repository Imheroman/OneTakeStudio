package com.onetake.core.notification.repository;

import com.onetake.core.notification.entity.Notification;
import com.onetake.core.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByUserOrderByCreatedAtDesc(User user);

    List<Notification> findAllByUserAndIsReadFalseOrderByCreatedAtDesc(User user);

    Optional<Notification> findByNotificationId(String notificationId);

    Optional<Notification> findByReferenceId(String referenceId);

    void deleteByReferenceId(String referenceId);
}
