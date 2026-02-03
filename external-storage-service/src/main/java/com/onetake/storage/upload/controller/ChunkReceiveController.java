package com.onetake.storage.upload.controller;

import com.onetake.storage.upload.dto.ChunkUploadResponse;
import com.onetake.storage.upload.dto.UploadCompleteResponse;
import com.onetake.storage.upload.dto.UploadInitRequest;
import com.onetake.storage.upload.dto.UploadInitResponse;
import com.onetake.storage.upload.service.ChunkStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 청크 업로드 수신 API
 */
@Slf4j
@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class ChunkReceiveController {

    private final ChunkStorageService chunkStorageService;

    /**
     * 업로드 세션 초기화
     * POST /api/upload/init
     */
    @PostMapping("/init")
    public ResponseEntity<UploadInitResponse> initializeUpload(@Valid @RequestBody UploadInitRequest request) {
        log.info("Upload init request: fileName={}, fileSize={}, totalChunks={}",
                request.getFileName(), request.getFileSize(), request.getTotalChunks());

        UploadInitResponse response = chunkStorageService.initializeUpload(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 청크 업로드
     * POST /api/upload/chunk/{uploadId}
     * Header: X-Chunk-Index (청크 인덱스)
     * Body: binary chunk data
     */
    @PostMapping(value = "/chunk/{uploadId}", consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<ChunkUploadResponse> uploadChunk(
            @PathVariable String uploadId,
            @RequestHeader("X-Chunk-Index") int chunkIndex,
            @RequestBody byte[] data) {

        log.debug("Chunk upload request: uploadId={}, chunkIndex={}, size={}",
                uploadId, chunkIndex, data.length);

        ChunkUploadResponse response = chunkStorageService.saveChunk(uploadId, chunkIndex, data);

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 업로드 완료 및 청크 병합 요청
     * POST /api/upload/complete/{uploadId}
     */
    @PostMapping("/complete/{uploadId}")
    public ResponseEntity<UploadCompleteResponse> completeUpload(@PathVariable String uploadId) {
        log.info("Upload complete request: uploadId={}", uploadId);

        UploadCompleteResponse response = chunkStorageService.completeUpload(uploadId);

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 헬스 체크
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}
