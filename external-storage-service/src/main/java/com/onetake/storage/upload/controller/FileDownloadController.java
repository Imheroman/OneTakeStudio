package com.onetake.storage.upload.controller;

import com.onetake.storage.upload.config.StorageConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * 파일 다운로드 API
 */
@Slf4j
@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
public class FileDownloadController {

    private final StorageConfig storageConfig;

    /**
     * 파일 다운로드
     * GET /files/{fileName}
     */
    @GetMapping("/{fileName}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        log.info("File download request: fileName={}", fileName);

        File file = new File(storageConfig.getBasePath() + "/" + fileName);

        if (!file.exists()) {
            log.warn("File not found: {}", fileName);
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(file);

        String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8)
                .replace("+", "%20");

        String contentDisposition = "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName;

        // MIME 타입 결정
        String contentType = determineContentType(fileName);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .contentLength(file.length())
                .body(resource);
    }

    /**
     * 파일 스트리밍 (비디오 플레이어용)
     * GET /files/stream/{fileName}
     */
    @GetMapping("/stream/{fileName}")
    public ResponseEntity<Resource> streamFile(@PathVariable String fileName) {
        log.info("File stream request: fileName={}", fileName);

        File file = new File(storageConfig.getBasePath() + "/" + fileName);

        if (!file.exists()) {
            log.warn("File not found: {}", fileName);
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(file);
        String contentType = determineContentType(fileName);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .contentLength(file.length())
                .body(resource);
    }

    /**
     * 파일 존재 여부 확인
     * HEAD /files/{fileName}
     */
    @RequestMapping(value = "/{fileName}", method = RequestMethod.HEAD)
    public ResponseEntity<Void> checkFileExists(@PathVariable String fileName) {
        File file = new File(storageConfig.getBasePath() + "/" + fileName);

        if (file.exists()) {
            return ResponseEntity.ok()
                    .contentLength(file.length())
                    .contentType(MediaType.parseMediaType(determineContentType(fileName)))
                    .build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    private String determineContentType(String fileName) {
        String lowerName = fileName.toLowerCase();
        if (lowerName.endsWith(".mp4")) {
            return "video/mp4";
        } else if (lowerName.endsWith(".webm")) {
            return "video/webm";
        } else if (lowerName.endsWith(".mkv")) {
            return "video/x-matroska";
        } else if (lowerName.endsWith(".avi")) {
            return "video/x-msvideo";
        } else if (lowerName.endsWith(".mov")) {
            return "video/quicktime";
        } else {
            return "application/octet-stream";
        }
    }
}
