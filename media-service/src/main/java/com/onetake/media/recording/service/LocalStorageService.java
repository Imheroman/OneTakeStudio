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
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * EC2 로컬 파일 저장소 서비스
 */
@Slf4j
@Service
public class LocalStorageService {

    @Value("${recording.storage.base-path:/recordings}")
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
     * 사용자별 디렉토리 생성 및 경로 반환
     */
    public String getUserStoragePath(String userId) {
        try {
            Path userPath = Paths.get(basePath, "user-" + userId);
            if (!Files.exists(userPath)) {
                Files.createDirectories(userPath);
                log.info("User storage directory created: {}", userPath);
            }
            return userPath.toString();
        } catch (IOException e) {
            log.error("Failed to create user storage directory for userId: {}", userId, e);
            throw new BusinessException(ErrorCode.STORAGE_ERROR);
        }
    }

    /**
     * 사용자별 파일 경로 생성
     */
    public String getUserFilePath(String userId, String fileName) {
        return Paths.get("user-" + userId, fileName).toString().replace('\\', '/');
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
     * InputStream으로부터 파일 저장 (업로드용)
     */
    public void saveFile(String relativeFilePath, InputStream inputStream) {
        try {
            Path targetPath = Paths.get(basePath, relativeFilePath);
            Files.createDirectories(targetPath.getParent());
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("File saved: {}", targetPath);
        } catch (IOException e) {
            log.error("Failed to save file: {}", relativeFilePath, e);
            throw new BusinessException(ErrorCode.FILE_STORAGE_ERROR);
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
        } else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (fileName.endsWith(".png")) {
            return "image/png";
        }
        return "application/octet-stream";
    }
}
