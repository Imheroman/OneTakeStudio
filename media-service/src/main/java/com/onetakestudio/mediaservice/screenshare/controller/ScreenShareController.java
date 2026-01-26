package com.onetakestudio.mediaservice.screenshare.controller;

import com.onetakestudio.mediaservice.global.common.ApiResponse;
import com.onetakestudio.mediaservice.screenshare.dto.ScreenShareResponse;
import com.onetakestudio.mediaservice.screenshare.dto.ScreenShareStartRequest;
import com.onetakestudio.mediaservice.screenshare.service.ScreenShareService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/media/screen-share")
@RequiredArgsConstructor
public class ScreenShareController {

    private final ScreenShareService screenShareService;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<ScreenShareResponse>> startScreenShare(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ScreenShareStartRequest request) {
        ScreenShareResponse response = screenShareService.startScreenShare(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/stop")
    public ResponseEntity<ApiResponse<ScreenShareResponse>> stopScreenShare(
            @RequestParam String shareId) {
        ScreenShareResponse response = screenShareService.stopScreenShare(shareId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<ScreenShareResponse>> getActiveScreenShare(
            @RequestParam Long studioId) {
        ScreenShareResponse response = screenShareService.getActiveScreenShare(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
