package com.onetake.media.screenshare.controller;

import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.global.resolver.StudioIdResolver;
import com.onetake.media.screenshare.dto.ScreenShareResponse;
import com.onetake.media.screenshare.dto.ScreenShareStartRequest;
import com.onetake.media.screenshare.service.ScreenShareService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/media/screen-share")
@RequiredArgsConstructor
public class ScreenShareController {

    private final ScreenShareService screenShareService;
    private final StudioIdResolver studioIdResolver;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<ScreenShareResponse>> startScreenShare(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ScreenShareStartRequest request) {
        Long studioId = studioIdResolver.resolveStudioId(request.getStudioId());
        ScreenShareResponse response = screenShareService.startScreenShare(userId, studioId, request);
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
            @RequestParam String studioId) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        ScreenShareResponse response = screenShareService.getActiveScreenShare(resolvedStudioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
