package com.onetake.core.library.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.library.dto.*;
import com.onetake.core.library.service.LibraryService;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/library")
@RequiredArgsConstructor
public class LibraryController {

    private final LibraryService libraryService;

    @GetMapping("/recordings")
    public ResponseEntity<ApiResponse<RecordingListResponse>> getRecordings(
            @CurrentUser CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String studioId) {

        log.debug("녹화 목록 조회 요청: userId={}, studioId={}", userDetails.getUserId(), studioId);

        RecordingListResponse response;
        if (studioId != null) {
            response = libraryService.getRecordingsByStudio(studioId, page, size);
        } else {
            response = libraryService.getRecordings(userDetails.getUserId(), page, size);
        }

        return ResponseEntity.ok(ApiResponse.success("녹화 목록 조회 성공", response));
    }

    @GetMapping("/recordings/{recordingId}")
    public ResponseEntity<ApiResponse<RecordingResponse>> getRecording(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String recordingId) {

        log.debug("녹화 상세 조회 요청: recordingId={}", recordingId);

        RecordingResponse response = libraryService.getRecording(userDetails.getUserId(), recordingId);

        return ResponseEntity.ok(ApiResponse.success("녹화 상세 조회 성공", response));
    }

    @PostMapping("/recordings")
    public ResponseEntity<ApiResponse<RecordingResponse>> createRecording(
            @CurrentUser CustomUserDetails userDetails,
            @Valid @RequestBody CreateRecordingRequest request) {

        log.debug("녹화 생성 요청: studioId={}", request.getStudioId());

        RecordingResponse response = libraryService.createRecording(userDetails.getUserId(), request);

        return ResponseEntity.ok(ApiResponse.success("녹화 생성 성공", response));
    }

    @PatchMapping("/recordings/{recordingId}")
    public ResponseEntity<ApiResponse<RecordingResponse>> updateRecording(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String recordingId,
            @Valid @RequestBody UpdateRecordingRequest request) {

        log.debug("녹화 수정 요청: recordingId={}", recordingId);

        RecordingResponse response = libraryService.updateRecording(
                userDetails.getUserId(), recordingId, request);

        return ResponseEntity.ok(ApiResponse.success("녹화 수정 성공", response));
    }

    @DeleteMapping("/recordings/{recordingId}")
    public ResponseEntity<ApiResponse<Void>> deleteRecording(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String recordingId) {

        log.debug("녹화 삭제 요청: recordingId={}", recordingId);

        libraryService.deleteRecording(userDetails.getUserId(), recordingId);

        return ResponseEntity.ok(ApiResponse.success("녹화 삭제 성공"));
    }

    @GetMapping("/recordings/{recordingId}/download")
    public ResponseEntity<ApiResponse<DownloadUrlResponse>> getDownloadUrl(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String recordingId) {

        log.debug("녹화 다운로드 URL 요청: recordingId={}", recordingId);

        DownloadUrlResponse response = libraryService.getDownloadUrl(
                userDetails.getUserId(), recordingId);

        return ResponseEntity.ok(ApiResponse.success("다운로드 URL 생성 성공", response));
    }

    // ==================== Comment Analysis & Markers ====================

    @GetMapping("/recordings/{recordingId}/comment-analysis")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCommentAnalysis(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String recordingId) {

        log.debug("댓글 분석 조회 요청: recordingId={}", recordingId);

        Map<String, Object> response = libraryService.getCommentAnalysis(
                userDetails.getUserId(), recordingId);

        return ResponseEntity.ok(ApiResponse.success("댓글 분석 조회 성공", response));
    }

    @GetMapping("/recordings/{recordingId}/markers")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMarkers(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String recordingId) {

        log.debug("마커 조회 요청: recordingId={}", recordingId);

        Map<String, Object> response = libraryService.getMarkers(
                userDetails.getUserId(), recordingId);

        return ResponseEntity.ok(ApiResponse.success("마커 조회 성공", response));
    }

    // ==================== Clips ====================

    @GetMapping("/clips")
    public ResponseEntity<ApiResponse<ClipListResponse>> getClips(
            @CurrentUser CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        log.debug("클립 목록 조회 요청: userId={}", userDetails.getUserId());

        ClipListResponse response = libraryService.getClips(userDetails.getUserId(), page, size);

        return ResponseEntity.ok(ApiResponse.success("클립 목록 조회 성공", response));
    }

    // ==================== Storage ====================

    @GetMapping("/storage")
    public ResponseEntity<ApiResponse<StorageResponse>> getStorage(
            @CurrentUser CustomUserDetails userDetails) {

        log.debug("저장용량 조회 요청: userId={}", userDetails.getUserId());

        StorageResponse response = libraryService.getStorage(userDetails.getUserId());

        return ResponseEntity.ok(ApiResponse.success("저장용량 조회 성공", response));
    }
}
