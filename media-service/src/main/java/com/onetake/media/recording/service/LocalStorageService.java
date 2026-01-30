package com.onetake.media.recording.service;

import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * EC2 로컬 파일 저장소 서비스
 */
@Slf4j
@Service
public class LocalStorageService {

    @Value("${recording.storage.base-path:/data/recordings}")
    private String basePath;

    @Value("${recording.storage.base-url:http://localhost:8082/api/recordings/files}")
    private String baseUrl;

    @PostConstruct
    public void init() {
        try {
            Path storagePath = Paths.get(basePath);
            if (!Files.exists(storagePath)) {
                Files.createDirectories(storagePath);
                log.info("Recording storage directory created: {}", basePath);
            }
        } catch (IOException e) {
            log.error("Failed to create recording storage directory: {}", basePath, e);
        }
    }

    /**
     * 파일 경로로 URL 생성
     */
    public String getFileUrl(String fileName) {
        return baseUrl + "/" + fileName;
    }

    /**
     * 파일 존재 여부 확인
     */
    public boolean fileExists(String fileName) {
        Path filePath = Paths.get(basePath, fileName);
        return Files.exists(filePath);
    }

    /**
     * 파일 크기 조회
     */
    public long getFileSize(String fileName) {
        try {
            Path filePath = Paths.get(basePath, fileName);
            return Files.size(filePath);
        } catch (IOException e) {
            log.error("Failed to get file size: {}", fileName, e);
            return 0;
        }
    }

    /**
     * 파일 리소스 로드 (다운로드/스트리밍용)
     */
    public Resource loadFileAsResource(String fileName) {
        try {
            Path filePath = Paths.get(basePath, fileName);
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
            }
        } catch (MalformedURLException e) {
            log.error("Failed to load file: {}", fileName, e);
            throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
        }
    }

    /**
     * 파일 삭제
     */
    public void deleteFile(String fileName) {
        try {
            Path filePath = Paths.get(basePath, fileName);
            Files.deleteIfExists(filePath);
            log.info("File deleted: {}", fileName);
        } catch (IOException e) {
            log.error("Failed to delete file: {}", fileName, e);
        }
    }

    /**
     * 전체 파일 경로 반환
     */
    public String getFullPath(String fileName) {
        return Paths.get(basePath, fileName).toString();
    }

    /**
     * Content-Type 반환
     */
    public String getContentType(String fileName) {
        if (fileName.endsWith(".mp4")) {
            return "video/mp4";
        } else if (fileName.endsWith(".webm")) {
            return "video/webm";
        } else if (fileName.endsWith(".mkv")) {
            return "video/x-matroska";
        }
        return "application/octet-stream";
    }
}
