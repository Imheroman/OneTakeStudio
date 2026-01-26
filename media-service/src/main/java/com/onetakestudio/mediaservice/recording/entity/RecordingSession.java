package com.onetakestudio.mediaservice.recording.entity;

import com.onetakestudio.mediaservice.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "recording_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RecordingSession extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "stream_session_id")
    private Long streamSessionId;

    @Column(name = "livekit_egress_id")
    private String livekitEgressId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RecordingStatus status;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "s3_key")
    private String s3Key;

    @Column(name = "s3_url")
    private String s3Url;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "duration_seconds")
    private Long durationSeconds;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "error_message")
    private String errorMessage;

    public void startRecording(String livekitEgressId) {
        this.livekitEgressId = livekitEgressId;
        this.status = RecordingStatus.RECORDING;
        this.startedAt = LocalDateTime.now();
    }

    public void stopRecording() {
        this.status = RecordingStatus.PROCESSING;
        this.endedAt = LocalDateTime.now();
    }

    public void pauseRecording() {
        this.status = RecordingStatus.PAUSED;
    }

    public void resumeRecording() {
        this.status = RecordingStatus.RECORDING;
    }

    public void startUploading() {
        this.status = RecordingStatus.UPLOADING;
    }

    public void complete(String s3Key, String s3Url, Long fileSize, Long durationSeconds) {
        this.s3Key = s3Key;
        this.s3Url = s3Url;
        this.fileSize = fileSize;
        this.durationSeconds = durationSeconds;
        this.status = RecordingStatus.COMPLETED;
    }

    public void fail(String errorMessage) {
        this.errorMessage = errorMessage;
        this.status = RecordingStatus.FAILED;
        if (this.endedAt == null) {
            this.endedAt = LocalDateTime.now();
        }
    }
}
