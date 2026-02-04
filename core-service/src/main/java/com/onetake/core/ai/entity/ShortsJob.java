package com.onetake.core.ai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shorts_jobs")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ShortsJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", unique = true, nullable = false, length = 36)
    private String jobId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "recording_id", nullable = false, length = 36)
    private String recordingId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private ShortsJobStatus status = ShortsJobStatus.PENDING;

    @Column(name = "total_count")
    @Builder.Default
    private Integer totalCount = 3;

    @Column(name = "completed_count")
    @Builder.Default
    private Integer completedCount = 0;

    @Column(name = "need_subtitles")
    @Builder.Default
    private Boolean needSubtitles = true;

    @Column(name = "subtitle_lang", length = 10)
    @Builder.Default
    private String subtitleLang = "ko";

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.jobId == null) {
            this.jobId = UUID.randomUUID().toString();
        }
    }

    public void incrementCompleted() {
        this.completedCount++;
        if (this.completedCount >= this.totalCount) {
            this.status = ShortsJobStatus.COMPLETED;
        } else {
            this.status = ShortsJobStatus.PROCESSING;
        }
    }

    public void markError(String message) {
        this.status = ShortsJobStatus.ERROR;
        this.errorMessage = message;
    }
}
