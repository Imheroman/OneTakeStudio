package com.onetake.media.shorts.controller;

import com.onetake.media.global.resolver.StudioIdResolver;
import com.onetake.media.shorts.dto.ShortsCreateRequest;
import com.onetake.media.shorts.dto.ShortsResponse;
import com.onetake.media.shorts.service.ShortsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AI 숏츠 생성 API
 */
@Slf4j
@RestController
@RequestMapping("/api/shorts")
@RequiredArgsConstructor
public class ShortsController {

    private final ShortsService shortsService;
    private final StudioIdResolver studioIdResolver;

    /**
     * 숏츠 생성 요청
     *
     * POST /api/shorts
     */
    @PostMapping
    public ResponseEntity<ShortsResponse> createShorts(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody ShortsCreateRequest request) {

        log.info("Creating shorts: userId={}, recordingId={}", userId, request.getRecordingId());

        ShortsResponse response = shortsService.createShorts(userId, request);
        return ResponseEntity.accepted().body(response);
    }

    /**
     * 작업 상태 조회
     *
     * GET /api/shorts/{jobId}
     */
    @GetMapping("/{jobId}")
    public ResponseEntity<ShortsResponse> getJob(@PathVariable String jobId) {
        ShortsResponse response = shortsService.getJob(jobId);
        return ResponseEntity.ok(response);
    }

    /**
     * 녹화별 작업 목록 조회
     *
     * GET /api/shorts/recordings/{recordingId}
     */
    @GetMapping("/recordings/{recordingId}")
    public ResponseEntity<List<ShortsResponse>> getJobsByRecording(
            @PathVariable Long recordingId) {

        List<ShortsResponse> responses = shortsService.getJobsByRecording(recordingId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 스튜디오별 작업 목록 조회
     *
     * GET /api/shorts/studios/{studioId}
     */
    @GetMapping("/studios/{studioId}")
    public ResponseEntity<List<ShortsResponse>> getJobsByStudio(
            @PathVariable String studioId) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        List<ShortsResponse> responses = shortsService.getJobsByStudio(resolvedStudioId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 내 작업 목록 조회
     *
     * GET /api/shorts/my
     */
    @GetMapping("/my")
    public ResponseEntity<List<ShortsResponse>> getMyJobs(
            @RequestHeader("X-User-Id") Long userId) {

        List<ShortsResponse> responses = shortsService.getJobsByUser(userId);
        return ResponseEntity.ok(responses);
    }
}
