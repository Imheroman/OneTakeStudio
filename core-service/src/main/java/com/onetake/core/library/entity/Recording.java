package com.onetake.core.library.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "recordings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Recording {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recording_id", unique = true, nullable = false, length = 36)
    private String recordingId;

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "s3_key")
    private String s3Key;

    @Column(name = "s3_url")
    private String s3Url;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private RecordingStatus status = RecordingStatus.PROCESSING;

    @Column(name = "media_recording_id")
    private Long mediaRecordingId;

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
        if (this.recordingId == null) {
            this.recordingId = UUID.randomUUID().toString();
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

    public void updateMediaInfo(String s3Key, String s3Url, Long fileSize, Integer durationSeconds, String thumbnailUrl) {
        this.s3Key = s3Key;
        this.s3Url = s3Url;
        this.fileSize = fileSize;
        this.durationSeconds = durationSeconds;
        this.thumbnailUrl = thumbnailUrl;
        this.status = RecordingStatus.READY;
    }

    public void markAsDeleted() {
        this.status = RecordingStatus.DELETED;
    }

    public void markAsFailed(String errorMessage) {
        this.status = RecordingStatus.FAILED;
        this.errorMessage = errorMessage;
    }

    public void markAsProcessing() {
        this.status = RecordingStatus.PROCESSING;
    }
}
