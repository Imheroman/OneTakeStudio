package com.onetakestudio.mediaservice.stream.controller;

import com.onetakestudio.mediaservice.global.common.ApiResponse;
import com.onetakestudio.mediaservice.stream.dto.IceServerResponse;
import com.onetakestudio.mediaservice.stream.dto.StreamSessionResponse;
import com.onetakestudio.mediaservice.stream.dto.StreamTokenRequest;
import com.onetakestudio.mediaservice.stream.dto.StreamTokenResponse;
import com.onetakestudio.mediaservice.stream.service.StreamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
public class StreamController {

    private final StreamService streamService;

    @PostMapping("/stream/join")
    public ResponseEntity<ApiResponse<StreamTokenResponse>> joinStream(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody StreamTokenRequest request) {
        StreamTokenResponse response = streamService.joinStream(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/stream/{studioId}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveStream(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long studioId) {
        streamService.leaveStream(studioId, userId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/stream/{studioId}/end")
    public ResponseEntity<ApiResponse<Void>> endStream(
            @PathVariable Long studioId) {
        streamService.endStream(studioId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/stream/{studioId}/session")
    public ResponseEntity<ApiResponse<StreamSessionResponse>> getActiveSession(
            @PathVariable Long studioId) {
        StreamSessionResponse response = streamService.getActiveSession(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/stream/{studioId}/history")
    public ResponseEntity<ApiResponse<List<StreamSessionResponse>>> getSessionHistory(
            @PathVariable Long studioId) {
        List<StreamSessionResponse> response = streamService.getSessionHistory(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/ice-servers")
    public ResponseEntity<ApiResponse<IceServerResponse>> getIceServers() {
        IceServerResponse response = streamService.getIceServers();
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
