package com.onetake.media.recording.entity;

import com.onetake.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

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

    @Column(name = "recording_id", unique = true, nullable = false, updatable = false, length = 36)
    private String recordingId;

    @Column(name = "studio_id", nullable = false)
    private String studioId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "stream_session_id")
    private Long streamSessionId;

    @Column(name = "egress_id")
    private String egressId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RecordingStatus status;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_url")
    private String fileUrl;

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

    // 외부 EC2 업로드 관련 필드
    @Enumerated(EnumType.STRING)
    @Column(name = "external_upload_status")
    private UploadStatus externalUploadStatus;

    @Column(name = "external_file_url")
    private String externalFileUrl;

    @Column(name = "external_uploaded_at")
    private LocalDateTime externalUploadedAt;

    public void startRecording(String egressId) {
        this.egressId = egressId;
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

    public void complete(String filePath, String fileUrl, Long fileSize, Long durationSeconds) {
        this.filePath = filePath;
        this.fileUrl = fileUrl;
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

    /**
     * 외부 EC2 업로드 상태 업데이트
     */
    public void updateExternalUploadStatus(UploadStatus status, String externalFileUrl) {
        this.externalUploadStatus = status;
        if (status == UploadStatus.COMPLETED && externalFileUrl != null) {
            this.externalFileUrl = externalFileUrl;
            this.externalUploadedAt = LocalDateTime.now();
        }
    }

    /**
     * 외부 업로드 대기 상태로 초기화
     */
    public void initExternalUpload() {
        this.externalUploadStatus = UploadStatus.PENDING;
    }

    @PrePersist
    public void prePersist() {
        if (this.recordingId == null) {
            this.recordingId = UUID.randomUUID().toString();
        }
    }
}
