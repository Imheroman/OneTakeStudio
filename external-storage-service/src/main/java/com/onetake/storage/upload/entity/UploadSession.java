package com.onetake.storage.upload.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 청크 업로드 세션 엔티티
 * 진행 중인 업로드의 상태를 추적
 */
@Entity
@Table(name = "upload_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class UploadSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "upload_id", unique = true, nullable = false, updatable = false, length = 36)
    private String uploadId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "total_chunks", nullable = false)
    private Integer totalChunks;

    @Column(name = "uploaded_chunks", nullable = false)
    private Integer uploadedChunks;

    @Column(name = "recording_id")
    private Long recordingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private UploadSessionStatus status;

    @Column(name = "chunk_storage_path")
    private String chunkStoragePath;

    @Column(name = "final_file_path")
    private String finalFilePath;

    @Column(name = "final_file_url")
    private String finalFileUrl;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.uploadId == null) {
            this.uploadId = UUID.randomUUID().toString();
        }
        if (this.uploadedChunks == null) {
            this.uploadedChunks = 0;
        }
        if (this.status == null) {
            this.status = UploadSessionStatus.INITIALIZED;
        }
        if (this.expiresAt == null) {
            // 기본 24시간 후 만료
            this.expiresAt = LocalDateTime.now().plusHours(24);
        }
    }

    /**
     * 청크 업로드 완료 시 카운트 증가
     */
    public void incrementUploadedChunks() {
        this.uploadedChunks++;
        this.status = UploadSessionStatus.UPLOADING;
    }

    /**
     * 모든 청크가 업로드되었는지 확인
     */
    public boolean isAllChunksUploaded() {
        return this.uploadedChunks.equals(this.totalChunks);
    }

    /**
     * 업로드 완료 처리
     */
    public void complete(String finalFilePath, String finalFileUrl) {
        this.finalFilePath = finalFilePath;
        this.finalFileUrl = finalFileUrl;
        this.status = UploadSessionStatus.COMPLETED;
    }

    /**
     * 업로드 실패 처리
     */
    public void fail(String errorMessage) {
        this.errorMessage = errorMessage;
        this.status = UploadSessionStatus.FAILED;
    }

    /**
     * 청크 저장 경로 설정
     */
    public void setChunkStoragePath(String chunkStoragePath) {
        this.chunkStoragePath = chunkStoragePath;
    }
}
