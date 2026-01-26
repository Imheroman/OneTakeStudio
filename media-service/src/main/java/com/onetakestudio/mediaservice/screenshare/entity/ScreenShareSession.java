package com.onetakestudio.mediaservice.screenshare.entity;

import com.onetakestudio.mediaservice.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "screen_share_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ScreenShareSession extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "screen_share_session_id", unique = true, nullable = false, updatable = false, length = 36)
    private String screenShareSessionId;

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "stream_session_id")
    private Long streamSessionId;

    @Column(name = "share_id", unique = true)
    private String shareId; // 고유 화면 공유 식별자

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ScreenShareStatus status;

    @Column(name = "source_type")
    private String sourceType; // "screen", "window", "tab"

    @Column(name = "track_id")
    private String trackId; // WebRTC track ID

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "stopped_at")
    private LocalDateTime stoppedAt;

    public void startSharing(String trackId) {
        this.trackId = trackId;
        this.status = ScreenShareStatus.ACTIVE;
        this.startedAt = LocalDateTime.now();
    }

    public void stopSharing() {
        this.status = ScreenShareStatus.STOPPED;
        this.stoppedAt = LocalDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (this.screenShareSessionId == null) {
            this.screenShareSessionId = UUID.randomUUID().toString();
        }
    }
}
