package com.onetake.core.ai.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.ai.dto.*;
import com.onetake.core.ai.service.AiShortsService;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
     * 숏츠 비디오 스트리밍
     * GET /api/ai/shorts/stream/{jobId}/{videoId}
     * (인증 없이 프론트엔드에서 video 태그로 재생)
     * Spring이 Resource 타입에 대해 Range 요청을 자동 처리 (206 Partial Content)
     */
    @GetMapping("/shorts/stream/{jobId}/{videoId}")
    public ResponseEntity<Resource> streamShorts(
            @PathVariable String jobId,
            @PathVariable String videoId) {

        try {
            Resource videoResource = aiShortsService.getVideoResource(jobId, videoId);
            log.info("숏츠 스트리밍: jobId={}, videoId={}, exists={}", jobId, videoId, videoResource.exists());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("video/mp4"))
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .body(videoResource);
        } catch (Exception e) {
            log.error("숏츠 스트리밍 실패: jobId={}, videoId={}, error={}", jobId, videoId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 숏츠 저장 (확정)
     * PATCH /api/ai/shorts/{jobId}/{videoId}/save
     */
    @PatchMapping("/shorts/{jobId}/{videoId}/save")
    public ResponseEntity<ApiResponse<Void>> saveShort(
            @PathVariable String jobId,
            @PathVariable String videoId) {

        aiShortsService.saveShort(jobId, videoId);
        return ResponseEntity.ok(ApiResponse.success("숏츠가 저장되었습니다", null));
    }

    /**
     * 녹화별 저장된 숏츠 목록 조회
     * GET /api/ai/shorts/saved/{recordingId}
     */
    @GetMapping("/shorts/saved/{recordingId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSavedShorts(
            @PathVariable String recordingId) {

        List<Map<String, Object>> savedShorts = aiShortsService.getSavedShorts(recordingId);
        return ResponseEntity.ok(ApiResponse.success("저장된 숏츠 조회 성공", savedShorts));
    }

    /**
     * 숏츠 다운로드
     * GET /api/ai/shorts/download/{jobId}/{videoId}
     */
    @GetMapping("/shorts/download/{jobId}/{videoId}")
    public ResponseEntity<Resource> downloadShorts(
            @PathVariable String jobId,
            @PathVariable String videoId) {

        Resource videoResource = aiShortsService.getVideoResource(jobId, videoId);
        String filename = "shorts_" + jobId.substring(0, 8) + "_" + videoId + ".mp4";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("video/mp4"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(videoResource);
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
