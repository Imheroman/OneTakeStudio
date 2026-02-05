package com.onetake.media.shorts.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * AI 숏츠 생성 작업 엔티티
 *
 * 하나의 녹화 영상에서 AI 숏츠를 생성하는 작업 단위
 */
@Entity
@Table(name = "shorts_jobs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ShortsJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 작업 고유 ID (AI 서버 통신용)
     * 형식: job_{timestamp}_{recordingId}
     */
    @Column(nullable = false, unique = true)
    private String jobId;

    /**
     * 원본 녹화 ID
     */
    @Column(nullable = false)
    private Long recordingId;

    /**
     * 스튜디오 ID
     */
    @Column(nullable = false)
    private String studioId;

    /**
     * 요청한 사용자 ID
     */
    @Column(nullable = false, length = 36)
    private String odUserId;

    /**
     * 작업 상태
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShortsStatus status;

    /**
     * 원본 영상 경로
     */
    private String videoPath;

    /**
     * 자막 필요 여부
     */
    @Builder.Default
    private Boolean needSubtitles = true;

    /**
     * 자막 언어
     */
    @Builder.Default
    private String subtitleLang = "ko";

    /**
     * 생성된 숏츠 파일 경로
     */
    private String outputPath;

    /**
     * 생성된 숏츠 URL
     */
    private String outputUrl;

    /**
     * 숏츠 길이 (초)
     */
    private Double durationSec;

    /**
     * 하이라이트 시작 시간 (초)
     */
    private Double highlightStartSec;

    /**
     * 하이라이트 종료 시간 (초)
     */
    private Double highlightEndSec;

    /**
     * 하이라이트 추출 이유
     */
    @Column(columnDefinition = "TEXT")
    private String highlightReason;

    /**
     * AI 추천 제목 (JSON 배열)
     */
    @Column(columnDefinition = "JSON")
    private String titlesJson;

    /**
     * 실패 시 에러 메시지
     */
    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * 요청 시각
     */
    @Column(nullable = false)
    private LocalDateTime createdAt;

    /**
     * 완료 시각
     */
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * 처리 시작
     */
    public void startProcessing() {
        this.status = ShortsStatus.PROCESSING;
    }

    /**
     * 처리 완료
     */
    public void complete(String outputPath, String outputUrl, Double durationSec,
                         Double highlightStartSec, Double highlightEndSec,
                         String highlightReason, String titlesJson) {
        this.status = ShortsStatus.COMPLETED;
        this.outputPath = outputPath;
        this.outputUrl = outputUrl;
        this.durationSec = durationSec;
        this.highlightStartSec = highlightStartSec;
        this.highlightEndSec = highlightEndSec;
        this.highlightReason = highlightReason;
        this.titlesJson = titlesJson;
        this.completedAt = LocalDateTime.now();
    }

    /**
     * 처리 실패
     */
    public void fail(String errorMessage) {
        this.status = ShortsStatus.FAILED;
        this.errorMessage = errorMessage;
        this.completedAt = LocalDateTime.now();
    }
}
