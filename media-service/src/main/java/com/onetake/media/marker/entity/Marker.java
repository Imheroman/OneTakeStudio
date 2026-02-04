package com.onetake.media.marker.entity;

import com.onetake.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * 하이라이트 마커 엔티티
 * - 사용자 수동 마킹 또는 채팅 분석 자동 마킹
 */
@Entity
@Table(name = "markers")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Marker extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "marker_id", unique = true, nullable = false, length = 36)
    private String markerId;

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Column(name = "recording_id", length = 36)
    private String recordingId;

    @Column(name = "user_id")
    private Long userId;

    /**
     * 마커 시간 (녹화 시작 기준, 초 단위)
     * 예: 930.5 = 15분 30.5초
     */
    @Column(name = "timestamp_sec", nullable = false)
    private Double timestampSec;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 20, nullable = false)
    @Builder.Default
    private MarkerSource source = MarkerSource.MANUAL;

    @Column(name = "label", length = 100)
    private String label;

    /**
     * 채팅 급증률 (자동 마커의 경우)
     * 예: 3.5 = 평균 대비 3.5배 급증
     */
    @Column(name = "chat_spike_ratio")
    private Double chatSpikeRatio;

    /**
     * 쇼츠 생성에 사용되었는지 여부
     */
    @Column(name = "used_for_shorts")
    @Builder.Default
    private Boolean usedForShorts = false;

    @PrePersist
    public void prePersist() {
        if (this.markerId == null) {
            this.markerId = UUID.randomUUID().toString();
        }
    }
}
