package com.onetake.media.shorts.controller;

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

    /**
     * 숏츠 생성 요청
     *
     * POST /api/shorts
     */
    @PostMapping
    public ResponseEntity<ShortsResponse> createShorts(
            @RequestHeader("X-User-Id") String odUserId,
            @RequestBody ShortsCreateRequest request) {

        log.info("Creating shorts: odUserId={}, recordingId={}", odUserId, request.getRecordingId());

        ShortsResponse response = shortsService.createShorts(odUserId, request);
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

        List<ShortsResponse> responses = shortsService.getJobsByStudio(studioId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 내 작업 목록 조회
     *
     * GET /api/shorts/my
     */
    @GetMapping("/my")
    public ResponseEntity<List<ShortsResponse>> getMyJobs(
            @RequestHeader("X-User-Id") String odUserId) {

        List<ShortsResponse> responses = shortsService.getJobsByUser(odUserId);
        return ResponseEntity.ok(responses);
    }
}
