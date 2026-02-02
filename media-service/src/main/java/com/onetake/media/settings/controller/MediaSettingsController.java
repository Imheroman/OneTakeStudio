package com.onetake.media.settings.controller;

import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.settings.dto.MediaStateUpdateRequest;
import com.onetake.media.settings.dto.SessionMediaStateResponse;
import com.onetake.media.settings.dto.UserMediaSettingsRequest;
import com.onetake.media.settings.dto.UserMediaSettingsResponse;
import com.onetake.media.settings.service.MediaSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/media/settings")
@RequiredArgsConstructor
public class MediaSettingsController {

    private final MediaSettingsService mediaSettingsService;

    // ===================== User Media Settings =====================

    @GetMapping
    public ResponseEntity<ApiResponse<UserMediaSettingsResponse>> getUserSettings(
            @RequestHeader("X-User-Id") Long userId) {
        UserMediaSettingsResponse response = mediaSettingsService.getUserSettings(userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserMediaSettingsResponse>> saveUserSettings(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody UserMediaSettingsRequest request) {
        UserMediaSettingsResponse response = mediaSettingsService.saveUserSettings(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // ===================== Session Media State =====================

    @PostMapping("/session/{studioId}/init")
    public ResponseEntity<ApiResponse<SessionMediaStateResponse>> initializeSessionState(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long studioId,
            @RequestParam(required = false) Long streamSessionId) {
        SessionMediaStateResponse response = mediaSettingsService.initializeSessionState(userId, studioId, streamSessionId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/session/{studioId}")
    public ResponseEntity<ApiResponse<SessionMediaStateResponse>> getSessionState(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long studioId) {
        SessionMediaStateResponse response = mediaSettingsService.getSessionState(studioId, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/session")
    public ResponseEntity<ApiResponse<SessionMediaStateResponse>> updateSessionState(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody MediaStateUpdateRequest request) {
        SessionMediaStateResponse response = mediaSettingsService.updateSessionState(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/session/{studioId}/video/toggle")
    public ResponseEntity<ApiResponse<SessionMediaStateResponse>> toggleVideo(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long studioId) {
        SessionMediaStateResponse response = mediaSettingsService.toggleVideo(studioId, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/session/{studioId}/audio/toggle")
    public ResponseEntity<ApiResponse<SessionMediaStateResponse>> toggleAudio(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long studioId) {
        SessionMediaStateResponse response = mediaSettingsService.toggleAudio(studioId, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/session/{studioId}/mute/toggle")
    public ResponseEntity<ApiResponse<SessionMediaStateResponse>> toggleMute(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long studioId) {
        SessionMediaStateResponse response = mediaSettingsService.toggleMute(studioId, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/session/{studioId}/participants")
    public ResponseEntity<ApiResponse<List<SessionMediaStateResponse>>> getParticipantsState(
            @PathVariable Long studioId) {
        List<SessionMediaStateResponse> response = mediaSettingsService.getParticipantsState(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/session/{studioId}")
    public ResponseEntity<ApiResponse<Void>> terminateSessionState(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long studioId) {
        mediaSettingsService.terminateSessionState(studioId, userId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
