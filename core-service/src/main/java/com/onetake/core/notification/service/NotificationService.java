package com.onetake.core.notification.service;

import com.onetake.core.notification.dto.NotificationListResponse;
import com.onetake.core.notification.dto.NotificationResponse;
import com.onetake.core.notification.entity.Notification;
import com.onetake.core.notification.repository.NotificationRepository;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.exception.UserNotFoundException;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * 사용자의 알림 목록 조회
     */
    @Transactional(readOnly = true)
    public NotificationListResponse getNotifications(String userId) {
        User user = findUserByUserId(userId);
        List<Notification> notifications = notificationRepository.findAllByUserOrderByCreatedAtDesc(user);

        List<NotificationResponse> responses = notifications.stream()
                .map(this::toResponse)
                .toList();

        return new NotificationListResponse(responses);
    }

    /**
     * 알림 생성
     */
    @Transactional
    public void createNotification(Notification notification) {
        notificationRepository.save(notification);
    }

    /**
     * 알림 읽음 처리
     */
    @Transactional
    public void markAsRead(String userId, String notificationId) {
        Notification notification = notificationRepository.findByNotificationId(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다."));

        if (!notification.getUser().getUserId().equals(userId)) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }

        notification.markAsRead();
    }

    /**
     * referenceId로 알림 삭제 (요청 수락/거절 시)
     */
    @Transactional
    public void deleteByReferenceId(String referenceId) {
        log.info("알림 삭제 요청: referenceId={}", referenceId);
        notificationRepository.deleteByReferenceId(referenceId);
        log.info("알림 삭제 쿼리 실행 완료: referenceId={}", referenceId);
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getNotificationId())
                .type(convertType(notification.getType()))
                .title(notification.getTitle())
                .message(notification.getMessage())
                .referenceId(notification.getReferenceId())
                .time(formatTime(notification.getCreatedAt()))
                .createdAt(notification.getCreatedAt().toString())
                .read(notification.getIsRead())
                .build();
    }

    private String convertType(Notification.NotificationType type) {
        return switch (type) {
            case FRIEND_REQUEST -> "friend_request";
            case STUDIO_INVITE -> "studio_invite";
            case AI_SHORTS -> "ai_shorts";
            case FILE_DELETION -> "file_deletion";
            case SYSTEM -> "system";
        };
    }

    private String formatTime(LocalDateTime createdAt) {
        LocalDateTime now = LocalDateTime.now();
        long minutes = ChronoUnit.MINUTES.between(createdAt, now);
        long hours = ChronoUnit.HOURS.between(createdAt, now);
        long days = ChronoUnit.DAYS.between(createdAt, now);

        if (minutes < 1) {
            return "방금 전";
        } else if (minutes < 60) {
            return minutes + "분 전";
        } else if (hours < 24) {
            return hours + "시간 전";
        } else if (days < 7) {
            return days + "일 전";
        } else {
            return createdAt.toLocalDate().toString();
        }
    }

    private User findUserByUserId(String userId) {
        return userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
    }
}
