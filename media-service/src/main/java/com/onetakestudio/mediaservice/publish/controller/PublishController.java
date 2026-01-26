package com.onetakestudio.mediaservice.publish.controller;

import com.onetakestudio.mediaservice.global.common.ApiResponse;
import com.onetakestudio.mediaservice.publish.dto.PublishResponse;
import com.onetakestudio.mediaservice.publish.dto.PublishStartRequest;
import com.onetakestudio.mediaservice.publish.dto.PublishStatusResponse;
import com.onetakestudio.mediaservice.publish.service.PublishService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/media/publish")
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
