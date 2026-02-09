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

    @Column(name = "duration_sec")
    private Double durationSec;

    @Column(name = "resolution", length = 20)
    private String resolution;

    @Column(name = "has_subtitles")
    private Boolean hasSubtitles;

    // 하이라이트 구간 정보
    @Column(name = "highlight_start_sec")
    private Double highlightStartSec;

    @Column(name = "highlight_end_sec")
    private Double highlightEndSec;

    @Column(name = "highlight_reason", length = 500)
    private String highlightReason;

    // AI 생성 제목들 (JSON 배열)
    @Column(name = "titles", columnDefinition = "TEXT")
    private String titles;

    @Column(name = "processing_time_sec")
    private Double processingTimeSec;

    // Progress 관련 필드
    @Column(name = "current_step")
    private Integer currentStep;

    @Column(name = "total_steps")
    private Integer totalSteps;

    @Column(name = "current_step_key", length = 50)
    private String currentStepKey;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "saved")
    @Builder.Default
    private Boolean saved = false;

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

    /**
     * API 명세서 구조에 맞춘 완료 처리
     */
    public void markCompletedWithDetails(
            String outputPath,
            Double durationSec,
            String resolution,
            Boolean hasSubtitles,
            Double highlightStartSec,
            Double highlightEndSec,
            String highlightReason,
            String titlesJson,
            Double processingTimeSec
    ) {
        this.status = ShortsResultStatus.COMPLETED;
        this.outputPath = outputPath;
        this.durationSec = durationSec;
        this.resolution = resolution;
        this.hasSubtitles = hasSubtitles;
        this.highlightStartSec = highlightStartSec;
        this.highlightEndSec = highlightEndSec;
        this.highlightReason = highlightReason;
        this.titles = titlesJson;
        this.processingTimeSec = processingTimeSec;
    }

    public void updateProgress(Integer step, Integer totalSteps, String stepKey) {
        this.status = ShortsResultStatus.PROCESSING;
        this.currentStep = step;
        this.totalSteps = totalSteps;
        this.currentStepKey = stepKey;
    }

    public void markError(String message) {
        this.status = ShortsResultStatus.ERROR;
        this.errorMessage = message;
    }

    public void markSaved() {
        this.saved = true;
    }
}
