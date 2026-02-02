package com.onetake.core.ai.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.ai.dto.*;
import com.onetake.core.ai.service.AiShortsService;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiShortsController {

    private final AiShortsService aiShortsService;

    /**
     * 쇼츠 생성 요청
     * POST /api/ai/shorts/generate
     */
    @PostMapping("/shorts/generate")
    public ResponseEntity<ApiResponse<ShortsGenerateResponse>> generateShorts(
            @CurrentUser CustomUserDetails userDetails,
            @Valid @RequestBody ShortsGenerateRequest request) {

        log.info("쇼츠 생성 요청: userId={}, recordingId={}", userDetails.getUserId(), request.getRecordingId());

        ShortsGenerateResponse response = aiShortsService.requestGeneration(
                userDetails.getUserId(),
                request
        );

        return ResponseEntity.ok(ApiResponse.success("쇼츠 생성이 시작되었습니다", response));
    }

    /**
     * 쇼츠 생성 상태 조회 (현재 사용자의 최근 Job)
     * GET /api/ai/shorts/status
     */
    @GetMapping("/shorts/status")
    public ResponseEntity<ApiResponse<ShortsStatusResponse>> getShortsStatus(
            @CurrentUser CustomUserDetails userDetails) {

        ShortsStatusResponse response = aiShortsService.getStatus(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("상태 조회 성공", response));
    }

    /**
     * 특정 Job 상태 조회
     * GET /api/ai/shorts/jobs/{jobId}
     */
    @GetMapping("/shorts/jobs/{jobId}")
    public ResponseEntity<ApiResponse<ShortsStatusResponse>> getJobStatus(
            @PathVariable String jobId) {

        ShortsStatusResponse response = aiShortsService.getJobStatus(jobId);
        return ResponseEntity.ok(ApiResponse.success("Job 상태 조회 성공", response));
    }

    /**
     * AI 서비스 Webhook 수신
     * POST /api/ai/webhook
     * (인증 없이 AI 서비스에서 호출)
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(@RequestBody AiWebhookPayload payload) {
        log.info("AI Webhook 수신: {}", payload);
        aiShortsService.handleWebhook(payload);
        return ResponseEntity.ok().build();
    }
}
