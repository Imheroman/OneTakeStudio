package com.onetake.media.recording.service;

import com.onetake.media.recording.config.ExternalUploadConfig;
import com.onetake.media.recording.entity.RecordingSession;
import com.onetake.media.recording.entity.UploadStatus;
import com.onetake.media.recording.repository.RecordingSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * 청크 기반 외부 서버 업로드 서비스
 * 대용량 파일(4GB~20GB+)을 안정적으로 전송하기 위한 청크 분할 업로드 구현
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChunkedUploadService {

    private final ExternalUploadConfig uploadConfig;
    private final RestTemplate restTemplate;
    private final RecordingSessionRepository recordingSessionRepository;

    /**
     * 업로드 활성화 여부 확인
     */
    public boolean isUploadEnabled() {
        return uploadConfig.isEnabled();
    }

    /**
     * 비동기 파일 업로드 처리
     * 녹화 완료 후 호출되어 백그라운드에서 청크 업로드 수행
     */
    @Async("uploadTaskExecutor")
    public CompletableFuture<String> uploadFileAsync(String filePath, Long recordingId) {
        log.info("Starting async upload: recordingId={}, filePath={}", recordingId, filePath);

        try {
            // 업로드 상태를 UPLOADING으로 변경
            updateUploadStatus(recordingId, UploadStatus.UPLOADING, null);

            File file = new File(filePath);
            if (!file.exists()) {
                throw new IOException("File not found: " + filePath);
            }

            long fileSize = file.length();
            String fileName = file.getName();
            int totalChunks = (int) Math.ceil((double) fileSize / uploadConfig.getChunkSize());

            log.info("Upload initialized: fileName={}, fileSize={}, totalChunks={}", fileName, fileSize, totalChunks);

            // 1. 업로드 세션 초기화
            String uploadId = initializeUpload(fileName, fileSize, totalChunks, recordingId);
            log.info("Upload session created: uploadId={}", uploadId);

            // 2. 청크 업로드
            uploadChunks(uploadId, file, totalChunks);

            // 3. 업로드 완료 요청
            String externalFileUrl = completeUpload(uploadId);
            log.info("Upload completed: uploadId={}, externalFileUrl={}", uploadId, externalFileUrl);

            // 4. 업로드 상태 업데이트
            updateUploadStatus(recordingId, UploadStatus.COMPLETED, externalFileUrl);

            return CompletableFuture.completedFuture(externalFileUrl);

        } catch (Exception e) {
            log.error("Upload failed: recordingId={}, error={}", recordingId, e.getMessage(), e);
            updateUploadStatus(recordingId, UploadStatus.FAILED, null);
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * 업로드 세션 초기화 요청
     */
    private String initializeUpload(String fileName, long fileSize, int totalChunks, Long recordingId) {
        String url = uploadConfig.getServerUrl() + "/init";

        HttpHeaders headers = createHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("fileName", fileName);
        body.put("fileSize", fileSize);
        body.put("totalChunks", totalChunks);
        body.put("recordingId", recordingId);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, request, Map.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return (String) response.getBody().get("uploadId");
        }

        throw new RuntimeException("Failed to initialize upload: " + response.getStatusCode());
    }

    /**
     * 파일을 청크로 분할하여 업로드
     */
    private void uploadChunks(String uploadId, File file, int totalChunks) throws IOException {
        int chunkSize = uploadConfig.getChunkSize();

        try (RandomAccessFile raf = new RandomAccessFile(file, "r")) {
            for (int chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                long offset = (long) chunkIndex * chunkSize;
                int currentChunkSize = (int) Math.min(chunkSize, file.length() - offset);

                byte[] chunkData = new byte[currentChunkSize];
                raf.seek(offset);
                raf.readFully(chunkData);

                boolean success = uploadChunkWithRetry(uploadId, chunkIndex, chunkData);
                if (!success) {
                    throw new IOException("Failed to upload chunk " + chunkIndex + " after " + uploadConfig.getMaxRetries() + " retries");
                }

                log.debug("Chunk uploaded: uploadId={}, chunk={}/{}", uploadId, chunkIndex + 1, totalChunks);
            }
        }

        log.info("All chunks uploaded successfully: uploadId={}, totalChunks={}", uploadId, totalChunks);
    }

    /**
     * 단일 청크 업로드 (재시도 포함)
     */
    private boolean uploadChunkWithRetry(String uploadId, int chunkIndex, byte[] data) {
        int maxRetries = uploadConfig.getMaxRetries();
        int retryDelay = uploadConfig.getRetryDelay();

        for (int attempt = 0; attempt < maxRetries; attempt++) {
            try {
                boolean result = uploadChunk(uploadId, chunkIndex, data);
                if (result) {
                    return true;
                }
            } catch (Exception e) {
                log.warn("Chunk upload attempt {} failed: uploadId={}, chunkIndex={}, error={}",
                        attempt + 1, uploadId, chunkIndex, e.getMessage());
            }

            if (attempt < maxRetries - 1) {
                try {
                    Thread.sleep(retryDelay * (attempt + 1)); // exponential backoff
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return false;
                }
            }
        }

        return false;
    }

    /**
     * 단일 청크 업로드 요청
     */
    private boolean uploadChunk(String uploadId, int chunkIndex, byte[] data) {
        String url = uploadConfig.getServerUrl() + "/chunk/" + uploadId;

        HttpHeaders headers = createHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.set("X-Chunk-Index", String.valueOf(chunkIndex));

        HttpEntity<byte[]> request = new HttpEntity<>(data, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, request, Map.class);

        return response.getStatusCode().is2xxSuccessful();
    }

    /**
     * 업로드 완료 및 병합 요청
     */
    private String completeUpload(String uploadId) {
        String url = uploadConfig.getServerUrl() + "/complete/" + uploadId;

        HttpHeaders headers = createHeaders();
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, request, Map.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return (String) response.getBody().get("fileUrl");
        }

        throw new RuntimeException("Failed to complete upload: " + response.getStatusCode());
    }

    /**
     * API 요청용 공통 헤더 생성
     */
    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        if (uploadConfig.getApiKey() != null && !uploadConfig.getApiKey().isEmpty()) {
            headers.set("X-API-Key", uploadConfig.getApiKey());
        }
        return headers;
    }

    /**
     * RecordingSession의 업로드 상태 업데이트
     */
    @Transactional
    public void updateUploadStatus(Long recordingId, UploadStatus status, String externalFileUrl) {
        recordingSessionRepository.findById(recordingId).ifPresent(session -> {
            session.updateExternalUploadStatus(status, externalFileUrl);
            recordingSessionRepository.save(session);
            log.info("Upload status updated: recordingId={}, status={}, externalFileUrl={}",
                    recordingId, status, externalFileUrl);
        });
    }
}
