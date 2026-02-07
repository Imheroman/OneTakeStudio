package com.onetake.media.chat.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "platform_tokens",
        uniqueConstraints = @UniqueConstraint(columnNames = {"od_user_id", "platform"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "od_user_id", nullable = false, length = 36)
    private String odUserId;

    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(name = "studio_id")
    private String studioId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatPlatform platform;

    @Column(name = "access_token", length = 2048)
    private String accessToken;

    @Column(name = "refresh_token", length = 2048)
    private String refreshToken;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    // YouTube 전용
    @Column(name = "live_chat_id")
    private String liveChatId;

    @Column(name = "broadcast_id")
    private String broadcastId;

    // 치지직 전용
    @Column(name = "channel_id")
    private String channelId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (this.userId == null && this.odUserId != null) {
            this.userId = this.odUserId;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        if (expiresAt == null) {
            return false;
        }
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isExpiringSoon() {
        if (expiresAt == null) {
            return false;
        }
        return LocalDateTime.now().plusMinutes(5).isAfter(expiresAt);
    }
}
