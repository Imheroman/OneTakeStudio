package com.onetakestudio.mediaservice.publish.entity;

import com.onetakestudio.mediaservice.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

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

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "stream_session_id")
    private Long streamSessionId;

    @Column(name = "livekit_egress_id")
    private String livekitEgressId;

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

    public void startPublishing(String livekitEgressId, String rtmpUrls) {
        this.livekitEgressId = livekitEgressId;
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
}
