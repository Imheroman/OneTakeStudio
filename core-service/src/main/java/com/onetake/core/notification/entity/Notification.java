package com.onetake.core.notification.entity;

import com.onetake.core.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "notification_id", unique = true, nullable = false, updatable = false, length = 36)
    private String notificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private NotificationType type;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "message", nullable = false, length = 500)
    private String message;

    @Column(name = "reference_id", length = 36)
    private String referenceId;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.notificationId == null) {
            this.notificationId = UUID.randomUUID().toString();
        }
    }

    public void markAsRead() {
        this.isRead = true;
    }

    public static Notification createFriendRequest(User target, User requester, String requestId) {
        return Notification.builder()
                .user(target)
                .type(NotificationType.FRIEND_REQUEST)
                .title("친구 요청")
                .message(requester.getNickname() + "님이 즐겨찾기 요청을 보냈습니다.")
                .referenceId(requestId)
                .isRead(false)
                .build();
    }

    public enum NotificationType {
        FRIEND_REQUEST,
        STUDIO_INVITE,
        AI_SHORTS,
        FILE_DELETION,
        SYSTEM
    }
}
