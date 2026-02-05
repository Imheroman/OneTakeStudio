package com.onetake.media.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 알림 Entity
 */
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

    /**
     * 사용자 ID (OneTakeStudio 통합 ID)
     */
    @Column(nullable = false)
    private String odUserId;

    /**
     * 알림 타입
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    /**
     * 알림 제목
     */
    @Column(nullable = false)
    private String title;

    /**
     * 알림 메시지
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /**
     * 관련 리소스 ID (예: jobId, recordingId 등)
     */
    @Column
    private String resourceId;

    /**
     * 읽음 여부
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    /**
     * 생성 시각
     */
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 읽음 처리
     */
    public void markAsRead() {
        this.isRead = true;
    }

    /**
     * 알림 생성 헬퍼 메서드
     */
    public static Notification create(String odUserId, NotificationType type,
                                     String title, String message, String resourceId) {
        return Notification.builder()
                .odUserId(odUserId)
                .type(type)
                .title(title)
                .message(message)
                .resourceId(resourceId)
                .isRead(false)
                .build();
    }
}
