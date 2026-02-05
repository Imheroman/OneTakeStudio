package com.onetake.media.stream.entity;

import com.onetake.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

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

    @Column(name = "session_id", unique = true, nullable = false, updatable = false, length = 36)
    private String sessionId;

    @Column(name = "studio_id", nullable = false)
    private String studioId;

    @Column(name = "od_user_id", nullable = false, length = 36)
    private String odUserId;

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

    /**
     * 같은 room_name 에 이미 행이 있을 때 재사용 (유니크 제약 회피).
     * CONNECTING/ACTIVE/DISCONNECTED/CLOSED/FAILED 모두 새 참가자로 갱신 후 CONNECTING 으로 설정.
     */
    public void reuseForNewParticipant(String odUserId, String participantIdentity, String metadata) {
        this.odUserId = odUserId;
        this.participantIdentity = participantIdentity;
        this.metadata = metadata;
        this.status = SessionStatus.CONNECTING;
        this.endedAt = null;
    }

    @PrePersist
    public void prePersist() {
        if (this.sessionId == null) {
            this.sessionId = UUID.randomUUID().toString();
        }
    }
}
