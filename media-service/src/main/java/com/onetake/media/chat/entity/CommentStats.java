package com.onetake.media.chat.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 녹화별 분당 댓글 수 통계
 *
 * AI 하이라이트 추출 및 라이브러리 그래프 시각화에 사용
 * 댓글 원문은 저장하지 않고, 분당 카운트만 저장하여 용량/개인정보 최소화
 */
@Entity
@Table(name = "comment_stats")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CommentStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 녹화 ID (Recording 테이블 참조)
     */
    @Column(nullable = false)
    private Long recordingId;

    /**
     * 스튜디오 ID
     */
    @Column(nullable = false)
    private String studioId;

    /**
     * 분당 댓글 수 (JSON 배열)
     * 예: [12, 25, 45, 30, 18, ...]
     * 인덱스 = 분 (0분, 1분, 2분, ...)
     */
    @Column(columnDefinition = "JSON")
    private String countsJson;

    /**
     * 총 방송 시간 (분)
     */
    private Integer durationMinutes;

    /**
     * 총 댓글 수
     */
    private Integer totalCount;

    /**
     * 생성 시간
     */
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
