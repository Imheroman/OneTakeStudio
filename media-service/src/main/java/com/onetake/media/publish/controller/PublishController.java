package com.onetake.media.publish.controller;

import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.publish.dto.PublishResponse;
import com.onetake.media.publish.dto.PublishStartRequest;
import com.onetake.media.publish.dto.PublishStatusResponse;
import com.onetake.media.publish.service.PublishService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/media/publish")
@RequiredArgsConstructor
public class PublishController {

    private final PublishService publishService;

    @PostMapping
    public ResponseEntity<ApiResponse<PublishResponse>> startPublish(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody PublishStartRequest request) {
        PublishResponse response = publishService.startPublish(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/stop")
    public ResponseEntity<ApiResponse<PublishResponse>> stopPublish(
            @RequestParam Long studioId) {
        PublishResponse response = publishService.stopPublish(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<PublishStatusResponse>> getPublishStatus(
            @RequestParam Long studioId) {
        PublishStatusResponse response = publishService.getPublishStatus(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
