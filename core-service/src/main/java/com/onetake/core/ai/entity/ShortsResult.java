package com.onetake.core.ai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shorts_results")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ShortsResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "result_id", unique = true, nullable = false, length = 36)
    private String resultId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", referencedColumnName = "id", nullable = false)
    private ShortsJob job;

    @Column(name = "video_id", length = 50)
    private String videoId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private ShortsResultStatus status = ShortsResultStatus.PENDING;

    @Column(name = "output_path", length = 500)
    private String outputPath;

    @Column(name = "thumbnail_path", length = 500)
    private String thumbnailPath;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "duration_sec")
    private Double durationSec;

    @Column(name = "processing_time_sec")
    private Double processingTimeSec;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.resultId == null) {
            this.resultId = UUID.randomUUID().toString();
        }
    }

    public void markCompleted(String outputPath, Double processingTimeSec) {
        this.status = ShortsResultStatus.COMPLETED;
        this.outputPath = outputPath;
        this.processingTimeSec = processingTimeSec;
    }

    public void markError(String message) {
        this.status = ShortsResultStatus.ERROR;
        this.errorMessage = message;
    }
}
