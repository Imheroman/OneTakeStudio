package com.onetake.media.publish.entity;

import com.onetake.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "publish_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PublishSession extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "publish_session_id", unique = true, nullable = false, updatable = false, length = 36)
    private String publishSessionId;

    @Column(name = "studio_id", nullable = false)
    private String studioId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "stream_session_id")
    private Long streamSessionId;

    @Column(name = "egress_id")
    private String egressId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PublishStatus status;

    @Column(name = "destination_ids", columnDefinition = "TEXT")
    private String destinationIds; // JSON array of destination IDs

    @Column(name = "rtmp_urls", columnDefinition = "TEXT")
    private String rtmpUrls; // JSON array of RTMP URLs

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "error_message")
    private String errorMessage;

    public void startPublishing(String egressId, String rtmpUrls) {
        this.egressId = egressId;
        this.rtmpUrls = rtmpUrls;
        this.status = PublishStatus.PUBLISHING;
        this.startedAt = LocalDateTime.now();
    }

    public void stopPublishing() {
        this.status = PublishStatus.STOPPED;
        this.endedAt = LocalDateTime.now();
    }

    public void fail(String errorMessage) {
        this.errorMessage = errorMessage;
        this.status = PublishStatus.FAILED;
        if (this.endedAt == null) {
            this.endedAt = LocalDateTime.now();
        }
    }

    @PrePersist
    public void prePersist() {
        if (this.publishSessionId == null) {
            this.publishSessionId = UUID.randomUUID().toString();
        }
    }
}
