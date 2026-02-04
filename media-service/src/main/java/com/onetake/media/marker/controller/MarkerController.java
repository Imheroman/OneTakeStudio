package com.onetake.media.marker.controller;

import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.global.resolver.StudioIdResolver;
import com.onetake.media.marker.dto.CreateMarkerRequest;
import com.onetake.media.marker.dto.MarkerResponse;
import com.onetake.media.marker.service.MarkerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/media/markers")
@RequiredArgsConstructor
public class MarkerController {

    private final MarkerService markerService;
    private final StudioIdResolver studioIdResolver;

    /**
     * 마커 생성 (사용자 수동 마킹)
     * POST /api/media/markers
     */
    @PostMapping
    public ResponseEntity<ApiResponse<MarkerResponse>> createMarker(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @Valid @RequestBody CreateMarkerRequest request) {

        Long studioId = studioIdResolver.resolveStudioId(request.getStudioId());
        log.info("마커 생성 요청: studioId={}, timestamp={}", studioId, request.getTimestampSec());
        MarkerResponse response = markerService.createManualMarker(userId, studioId, request);
        return ResponseEntity.ok(ApiResponse.success("마커가 생성되었습니다", response));
    }

    /**
     * 스튜디오의 마커 목록 조회
     * GET /api/media/markers/studio/{studioId}
     */
    @GetMapping("/studio/{studioId}")
    public ResponseEntity<ApiResponse<List<MarkerResponse>>> getMarkersByStudio(
            @PathVariable String studioId) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        List<MarkerResponse> markers = markerService.getMarkersByStudio(resolvedStudioId);
        return ResponseEntity.ok(ApiResponse.success("마커 목록 조회 성공", markers));
    }

    /**
     * 녹화의 마커 목록 조회
     * GET /api/media/markers/recording/{recordingId}
     */
    @GetMapping("/recording/{recordingId}")
    public ResponseEntity<ApiResponse<List<MarkerResponse>>> getMarkersByRecording(
            @PathVariable String recordingId) {

        List<MarkerResponse> markers = markerService.getMarkersByRecording(recordingId);
        return ResponseEntity.ok(ApiResponse.success("마커 목록 조회 성공", markers));
    }

    /**
     * 마커 삭제
     * DELETE /api/media/markers/{markerId}
     */
    @DeleteMapping("/{markerId}")
    public ResponseEntity<ApiResponse<Void>> deleteMarker(@PathVariable String markerId) {
        markerService.deleteMarker(markerId);
        return ResponseEntity.ok(ApiResponse.success("마커가 삭제되었습니다"));
    }
}
