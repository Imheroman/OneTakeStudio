package com.onetake.media.viewer.entity;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "viewer_metrics", indexes = {
        @Index(name = "idx_viewer_metrics_studio_platform", columnList = "studio_id, platform"),
        @Index(name = "idx_viewer_metrics_studio_recorded", columnList = "studio_id, recorded_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ViewerMetrics extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "metrics_id", unique = true, nullable = false, updatable = false, length = 36)
    private String metricsId;

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false, length = 20)
    private ChatPlatform platform;

    @Column(name = "current_viewers", nullable = false)
    private Long currentViewers;

    @Column(name = "peak_viewers", nullable = false)
    private Long peakViewers;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @PrePersist
    public void prePersist() {
        if (this.metricsId == null) {
            this.metricsId = UUID.randomUUID().toString();
        }
        if (this.recordedAt == null) {
            this.recordedAt = LocalDateTime.now();
        }
    }

    public void updateViewerCount(Long currentViewers) {
        this.currentViewers = currentViewers;
        if (currentViewers > this.peakViewers) {
            this.peakViewers = currentViewers;
        }
        this.recordedAt = LocalDateTime.now();
    }

    public static ViewerMetrics create(Long studioId, ChatPlatform platform, Long currentViewers) {
        return ViewerMetrics.builder()
                .studioId(studioId)
                .platform(platform)
                .currentViewers(currentViewers)
                .peakViewers(currentViewers)
                .recordedAt(LocalDateTime.now())
                .build();
    }
}
