package com.onetake.core.library.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.library.dto.StorageFilesResponse;
import com.onetake.core.library.dto.StorageResponse;
import com.onetake.core.library.service.LibraryService;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 스토리지 API (프론트엔드 /api/storage 호출용)
 * 개인당 30GB 클라우드 스토리지 제공
 */
@Slf4j
@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
public class StorageController {

    private final LibraryService libraryService;

    /**
     * 스토리지 사용량 조회
     * GET /api/storage
     */
    @GetMapping
    public ResponseEntity<StorageResponse> getStorage(
            @CurrentUser CustomUserDetails userDetails) {

        log.debug("스토리지 사용량 조회: userId={}", userDetails.getUserId());

        StorageResponse response = libraryService.getStorage(userDetails.getUserId());

        // 프론트엔드에서 ApiResponse.data가 아닌 직접 객체를 기대하므로 직접 반환
        return ResponseEntity.ok(response);
    }

    /**
     * 스토리지 파일 목록 조회
     * GET /api/storage/files
     */
    @GetMapping("/files")
    public ResponseEntity<StorageFilesResponse> getStorageFiles(
            @CurrentUser CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        log.debug("스토리지 파일 목록 조회: userId={}", userDetails.getUserId());

        StorageFilesResponse response = libraryService.getStorageFiles(
                userDetails.getUserId(), page, size);

        return ResponseEntity.ok(response);
    }

    /**
     * 스토리지 파일 삭제 (녹화 파일)
     * DELETE /api/storage/files/{recordingId}
     */
    @DeleteMapping("/files/{recordingId}")
    public ResponseEntity<ApiResponse<Void>> deleteStorageFile(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String recordingId) {

        log.debug("스토리지 파일 삭제: userId={}, recordingId={}",
                userDetails.getUserId(), recordingId);

        libraryService.deleteRecording(userDetails.getUserId(), recordingId);

        return ResponseEntity.ok(ApiResponse.success("파일이 삭제되었습니다"));
    }

    /**
     * 스토리지 용량 체크 (내부 API - Media Service 호출용)
     * POST /api/storage/check-quota
     */
    @PostMapping("/check-quota")
    public ResponseEntity<ApiResponse<Boolean>> checkQuota(
            @RequestParam String userId,
            @RequestParam Long fileSize) {

        log.debug("스토리지 용량 체크: userId={}, fileSize={}bytes", userId, fileSize);

        libraryService.checkStorageQuota(userId, fileSize);

        return ResponseEntity.ok(ApiResponse.success("용량 체크 성공", true));
    }
}
