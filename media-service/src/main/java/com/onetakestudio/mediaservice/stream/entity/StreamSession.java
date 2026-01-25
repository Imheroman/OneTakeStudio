package com.onetakestudio.mediaservice.stream.entity;

import com.onetakestudio.mediaservice.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "stream_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class StreamSession extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "room_name", nullable = false, unique = true)
    private String roomName;

    @Column(name = "participant_identity", nullable = false)
    private String participantIdentity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SessionStatus status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;

    public void activate() {
        this.status = SessionStatus.ACTIVE;
        this.startedAt = LocalDateTime.now();
    }

    public void disconnect() {
        this.status = SessionStatus.DISCONNECTED;
        this.endedAt = LocalDateTime.now();
    }

    public void close() {
        this.status = SessionStatus.CLOSED;
        this.endedAt = LocalDateTime.now();
    }

    public void fail() {
        this.status = SessionStatus.FAILED;
        this.endedAt = LocalDateTime.now();
    }
}
