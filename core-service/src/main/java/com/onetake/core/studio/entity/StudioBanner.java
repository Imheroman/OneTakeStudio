package com.onetake.core.studio.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "studio_banners")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class StudioBanner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "banner_id", unique = true, nullable = false, length = 36)
    private String bannerId;

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Column(nullable = false, length = 500)
    private String text;

    @Column(name = "timer_seconds")
    private Integer timerSeconds;

    @Column(name = "is_ticker", nullable = false)
    @Builder.Default
    private Boolean isTicker = false;

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (bannerId == null) {
            bannerId = UUID.randomUUID().toString();
        }
    }
}
