package com.onetake.media.publish.controller;

import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.global.resolver.StudioIdResolver;
import com.onetake.media.publish.dto .PublishResponse;
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
    private final StudioIdResolver studioIdResolver;

    @PostMapping
    public ResponseEntity<ApiResponse<PublishResponse>> startPublish(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody PublishStartRequest request) {
        Long studioId = studioIdResolver.resolveStudioId(request.getStudioId());
        PublishResponse response = publishService.startPublish(userId, studioId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/stop")
    public ResponseEntity<ApiResponse<PublishResponse>> stopPublish(
            @RequestParam String studioId) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        PublishResponse response = publishService.stopPublish(resolvedStudioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<PublishStatusResponse>> getPublishStatus(
            @RequestParam String studioId) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        PublishStatusResponse response = publishService.getPublishStatus(resolvedStudioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
