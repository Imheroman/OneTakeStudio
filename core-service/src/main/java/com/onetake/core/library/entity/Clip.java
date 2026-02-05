package com.onetake.core.library.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "clips")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Clip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "clip_id", unique = true, nullable = false, length = 36)
    private String clipId;

    @Column(name = "recording_id", nullable = false)
    private Long recordingId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "start_time")
    private Integer startTime;

    @Column(name = "end_time")
    private Integer endTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ClipStatus status = ClipStatus.PROCESSING;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    @Builder.Default
    private ClipSourceType sourceType = ClipSourceType.MANUAL;

    @Column(name = "ai_job_id")
    private String aiJobId;

    @Column(name = "subtitle_url")
    private String subtitleUrl;

    @Column(name = "error_message")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.clipId == null) {
            this.clipId = UUID.randomUUID().toString();
        }
    }

    public void updateInfo(String title, String description) {
        if (title != null) {
            this.title = title;
        }
        if (description != null) {
            this.description = description;
        }
    }

    public void markAsReady(String filePath, String fileUrl, Long fileSize, Integer durationSeconds, String thumbnailUrl) {
        this.filePath = filePath;
        this.fileUrl = fileUrl;
        this.fileSize = fileSize;
        this.durationSeconds = durationSeconds;
        this.thumbnailUrl = thumbnailUrl;
        this.status = ClipStatus.READY;
    }

    public void markAsDeleted() {
        this.status = ClipStatus.DELETED;
    }

    public void markAsFailed(String errorMessage) {
        this.status = ClipStatus.FAILED;
        this.errorMessage = errorMessage;
    }

    public void setSubtitleUrl(String subtitleUrl) {
        this.subtitleUrl = subtitleUrl;
    }
}
