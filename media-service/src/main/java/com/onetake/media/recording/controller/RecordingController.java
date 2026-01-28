package com.onetake.media.recording.controller;

import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.recording.dto.RecordingResponse;
import com.onetake.media.recording.dto.RecordingStartRequest;
import com.onetake.media.recording.service.RecordingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/media/record")
@RequiredArgsConstructor
public class RecordingController {

    private final RecordingService recordingService;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<RecordingResponse>> startRecording(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody RecordingStartRequest request) {
        RecordingResponse response = recordingService.startRecording(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{studioId}/stop")
    public ResponseEntity<ApiResponse<RecordingResponse>> stopRecording(
            @PathVariable Long studioId) {
        RecordingResponse response = recordingService.stopRecording(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{studioId}/pause")
    public ResponseEntity<ApiResponse<RecordingResponse>> pauseRecording(
            @PathVariable Long studioId) {
        RecordingResponse response = recordingService.pauseRecording(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{studioId}/resume")
    public ResponseEntity<ApiResponse<RecordingResponse>> resumeRecording(
            @PathVariable Long studioId) {
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
            @PathVariable Long studioId) {
        RecordingResponse response = recordingService.getActiveRecording(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/studio/{studioId}")
    public ResponseEntity<ApiResponse<List<RecordingResponse>>> getRecordingsByStudio(
            @PathVariable Long studioId) {
        List<RecordingResponse> response = recordingService.getRecordingsByStudio(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
