package com.onetake.media.recording.controller;

import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.recording.dto.RecordingResponse;
import com.onetake.media.recording.dto.RecordingStartRequest;
import com.onetake.media.recording.service.LocalStorageService;
import com.onetake.media.recording.service.RecordingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/media/record")
@RequiredArgsConstructor
public class RecordingController {

    private final RecordingService recordingService;
    private final LocalStorageService localStorageService;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<RecordingResponse>> startRecording(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody RecordingStartRequest request) {
        String studioId = request.getStudioId();
        RecordingResponse response = recordingService.startRecording(userId, studioId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{studioId}/stop")
    public ResponseEntity<ApiResponse<RecordingResponse>> stopRecording(
            @PathVariable String studioId) {
        RecordingResponse response = recordingService.stopRecording(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{studioId}/pause")
    public ResponseEntity<ApiResponse<RecordingResponse>> pauseRecording(
            @PathVariable String studioId) {
        RecordingResponse response = recordingService.pauseRecording(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{studioId}/resume")
    public ResponseEntity<ApiResponse<RecordingResponse>> resumeRecording(
            @PathVariable String studioId) {
        RecordingResponse response = recordingService.resumeRecording(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{recordingId}")
    public ResponseEntity<ApiResponse<RecordingResponse>> getRecording(
            @PathVariable String recordingId) {
        RecordingResponse response = recordingService.getRecordingByUuid(recordingId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/studio/{studioId}/active")
    public ResponseEntity<ApiResponse<RecordingResponse>> getActiveRecording(
            @PathVariable String studioId) {
        RecordingResponse response = recordingService.getActiveRecording(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/studio/{studioId}")
    public ResponseEntity<ApiResponse<List<RecordingResponse>>> getRecordingsByStudio(
            @PathVariable String studioId) {
        List<RecordingResponse> response = recordingService.getRecordingsByStudio(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 녹화 파일 다운로드/스트리밍
     */
    @GetMapping("/files/{fileName}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        Resource resource = localStorageService.loadFileAsResource(fileName);
        String contentType = localStorageService.getContentType(fileName);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                .body(resource);
    }
}
