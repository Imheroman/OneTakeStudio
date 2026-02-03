package com.onetake.storage.upload.service;

import com.onetake.storage.upload.config.StorageConfig;
import com.onetake.storage.upload.dto.ChunkUploadResponse;
import com.onetake.storage.upload.dto.UploadCompleteResponse;
import com.onetake.storage.upload.dto.UploadInitRequest;
import com.onetake.storage.upload.dto.UploadInitResponse;
import com.onetake.storage.upload.entity.UploadSession;
import com.onetake.storage.upload.entity.UploadSessionStatus;
import com.onetake.storage.upload.repository.UploadSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * 청크 저장 및 병합 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChunkStorageService {

    private final UploadSessionRepository uploadSessionRepository;
    private final StorageConfig storageConfig;

    /**
     * 업로드 세션 초기화
     */
    @Transactional
    public UploadInitResponse initializeUpload(UploadInitRequest request) {
        // 업로드 세션 생성
        UploadSession session = UploadSession.builder()
                .fileName(request.getFileName())
                .fileSize(request.getFileSize())
                .totalChunks(request.getTotalChunks())
                .recordingId(request.getRecordingId())
                .status(UploadSessionStatus.INITIALIZED)
                .build();

        uploadSessionRepository.save(session);

        // 청크 저장 디렉토리 생성
        String chunkDir = createChunkDirectory(session.getUploadId());
        session.setChunkStoragePath(chunkDir);
        uploadSessionRepository.save(session);

        log.info("Upload session initialized: uploadId={}, fileName={}, totalChunks={}",
                session.getUploadId(), request.getFileName(), request.getTotalChunks());

        return UploadInitResponse.of(session.getUploadId());
    }

    /**
     * 청크 저장
     */
    @Transactional
    public ChunkUploadResponse saveChunk(String uploadId, int chunkIndex, byte[] data) {
        UploadSession session = uploadSessionRepository.findByUploadId(uploadId)
                .orElseThrow(() -> new RuntimeException("Upload session not found: " + uploadId));

        if (session.getStatus() == UploadSessionStatus.COMPLETED ||
                session.getStatus() == UploadSessionStatus.FAILED) {
            return ChunkUploadResponse.failure(chunkIndex, "Upload session is already " + session.getStatus());
        }

        try {
            // 청크 파일 저장
            String chunkFilePath = session.getChunkStoragePath() + "/chunk_" + String.format("%05d", chunkIndex);
            Files.write(Paths.get(chunkFilePath), data);

            // 업로드된 청크 수 증가
            session.incrementUploadedChunks();
            uploadSessionRepository.save(session);

            log.debug("Chunk saved: uploadId={}, chunkIndex={}, uploadedChunks={}/{}",
                    uploadId, chunkIndex, session.getUploadedChunks(), session.getTotalChunks());

            return ChunkUploadResponse.success(chunkIndex, session.getUploadedChunks(), session.getTotalChunks());

        } catch (IOException e) {
            log.error("Failed to save chunk: uploadId={}, chunkIndex={}, error={}",
                    uploadId, chunkIndex, e.getMessage(), e);
            return ChunkUploadResponse.failure(chunkIndex, "Failed to save chunk: " + e.getMessage());
        }
    }

    /**
     * 청크 병합 및 업로드 완료 처리
     */
    @Transactional
    public UploadCompleteResponse completeUpload(String uploadId) {
        UploadSession session = uploadSessionRepository.findByUploadId(uploadId)
                .orElseThrow(() -> new RuntimeException("Upload session not found: " + uploadId));

        if (!session.isAllChunksUploaded()) {
            return UploadCompleteResponse.failure(
                    String.format("Not all chunks uploaded: %d/%d", session.getUploadedChunks(), session.getTotalChunks()));
        }

        try {
            // 병합 상태로 변경
            session.fail(""); // 임시로 상태만 변경
            session = uploadSessionRepository.save(session);

            // 청크 병합
            String finalFilePath = mergeChunks(session);

            // 최종 파일 URL 생성
            String fileUrl = storageConfig.getBaseUrl() + "/" + session.getFileName();

            // 세션 완료 처리
            session.complete(finalFilePath, fileUrl);
            uploadSessionRepository.save(session);

            // 청크 파일 정리
            cleanupChunks(session.getChunkStoragePath());

            log.info("Upload completed: uploadId={}, finalFilePath={}, fileUrl={}",
                    uploadId, finalFilePath, fileUrl);

            return UploadCompleteResponse.success(fileUrl, session.getFileSize());

        } catch (Exception e) {
            log.error("Failed to complete upload: uploadId={}, error={}", uploadId, e.getMessage(), e);
            session.fail(e.getMessage());
            uploadSessionRepository.save(session);
            return UploadCompleteResponse.failure("Failed to merge chunks: " + e.getMessage());
        }
    }

    /**
     * 청크 저장 디렉토리 생성
     */
    private String createChunkDirectory(String uploadId) {
        String chunkDir = storageConfig.getChunkPath() + "/" + uploadId;
        try {
            Files.createDirectories(Paths.get(chunkDir));
        } catch (IOException e) {
            throw new RuntimeException("Failed to create chunk directory: " + chunkDir, e);
        }
        return chunkDir;
    }

    /**
     * 청크 파일들을 하나의 파일로 병합
     */
    private String mergeChunks(UploadSession session) throws IOException {
        String outputPath = storageConfig.getBasePath() + "/" + session.getFileName();

        // 출력 디렉토리 생성
        Files.createDirectories(Paths.get(storageConfig.getBasePath()));

        // 청크 파일 목록 정렬
        File chunkDir = new File(session.getChunkStoragePath());
        File[] chunkFiles = chunkDir.listFiles((dir, name) -> name.startsWith("chunk_"));

        if (chunkFiles == null || chunkFiles.length != session.getTotalChunks()) {
            throw new IOException("Chunk count mismatch");
        }

        // 파일명 기준 정렬
        java.util.Arrays.sort(chunkFiles, Comparator.comparing(File::getName));

        // 병합
        try (FileOutputStream fos = new FileOutputStream(outputPath);
             BufferedOutputStream bos = new BufferedOutputStream(fos, 8192)) {

            byte[] buffer = new byte[8192];
            for (File chunkFile : chunkFiles) {
                try (FileInputStream fis = new FileInputStream(chunkFile);
                     BufferedInputStream bis = new BufferedInputStream(fis, 8192)) {
                    int bytesRead;
                    while ((bytesRead = bis.read(buffer)) != -1) {
                        bos.write(buffer, 0, bytesRead);
                    }
                }
            }
        }

        log.info("Chunks merged: uploadId={}, outputPath={}", session.getUploadId(), outputPath);
        return outputPath;
    }

    /**
     * 청크 파일 정리
     */
    private void cleanupChunks(String chunkDir) {
        try {
            Path path = Paths.get(chunkDir);
            if (Files.exists(path)) {
                Files.walk(path)
                        .sorted(Comparator.reverseOrder())
                        .forEach(p -> {
                            try {
                                Files.delete(p);
                            } catch (IOException e) {
                                log.warn("Failed to delete: {}", p);
                            }
                        });
            }
            log.info("Chunks cleaned up: {}", chunkDir);
        } catch (IOException e) {
            log.warn("Failed to cleanup chunks: {}", chunkDir, e);
        }
    }

    /**
     * 만료된 업로드 세션 정리 (매시간 실행)
     */
    @Scheduled(fixedRate = 3600000) // 1시간마다
    @Transactional
    public void cleanupExpiredSessions() {
        LocalDateTime now = LocalDateTime.now();

        List<UploadSession> expiredSessions = uploadSessionRepository
                .findByStatusAndExpiresAtBefore(UploadSessionStatus.INITIALIZED, now);

        expiredSessions.addAll(uploadSessionRepository
                .findByStatusAndExpiresAtBefore(UploadSessionStatus.UPLOADING, now));

        for (UploadSession session : expiredSessions) {
            log.info("Cleaning up expired session: uploadId={}", session.getUploadId());

            // 청크 파일 정리
            if (session.getChunkStoragePath() != null) {
                cleanupChunks(session.getChunkStoragePath());
            }

            // 세션 상태 업데이트
            session.fail("Session expired");
            uploadSessionRepository.save(session);
        }

        if (!expiredSessions.isEmpty()) {
            log.info("Cleaned up {} expired upload sessions", expiredSessions.size());
        }
    }
}
