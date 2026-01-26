package com.onetake.core.destination.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "connected_destinations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ConnectedDestination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "destination_id", unique = true, nullable = false, updatable = false, length = 36)
    private String destinationId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "platform", nullable = false, length = 50)
    private String platform;

    @Column(name = "channel_id", nullable = false)
    private String channelId;

    @Column(name = "channel_name")
    private String channelName;

    @Column(name = "access_token", columnDefinition = "TEXT")
    private String accessToken;

    @Column(name = "refresh_token", columnDefinition = "TEXT")
    private String refreshToken;

    @Column(name = "token_expires_at")
    private LocalDateTime tokenExpiresAt;

    @Column(name = "rtmp_url")
    private String rtmpUrl;

    @Column(name = "stream_key")
    private String streamKey;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.destinationId == null) {
            this.destinationId = UUID.randomUUID().toString();
        }
    }

    public void updateTokens(String accessToken, String refreshToken, LocalDateTime tokenExpiresAt) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiresAt = tokenExpiresAt;
    }

    public void updateChannelInfo(String channelId, String channelName) {
        this.channelId = channelId;
        this.channelName = channelName;
    }

    public void updateStreamInfo(String rtmpUrl, String streamKey) {
        this.rtmpUrl = rtmpUrl;
        this.streamKey = streamKey;
    }

    public void deactivate() {
        this.isActive = false;
    }

    public void activate() {
        this.isActive = true;
    }

    public boolean isTokenExpired() {
        return this.tokenExpiresAt != null && this.tokenExpiresAt.isBefore(LocalDateTime.now());
    }
}
