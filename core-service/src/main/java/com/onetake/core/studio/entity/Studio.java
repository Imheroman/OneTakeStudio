package com.onetake.core.studio.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "studios")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Studio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "studio_id", unique = true, nullable = false, length = 36)
    private String studioId;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String thumbnail;

    @Column(length = 50)
    private String template;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private StudioStatus status = StudioStatus.READY;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (studioId == null) {
            studioId = UUID.randomUUID().toString();
        }
    }

    public void updateInfo(String name, String thumbnail) {
        if (name != null) {
            this.name = name;
        }
        if (thumbnail != null) {
            this.thumbnail = thumbnail;
        }
    }

    public boolean isStreaming() {
        return this.status == StudioStatus.LIVE;
    }

    public void startStreaming() {
        this.status = StudioStatus.LIVE;
    }

    public void endStreaming() {
        this.status = StudioStatus.ENDED;
    }
}
