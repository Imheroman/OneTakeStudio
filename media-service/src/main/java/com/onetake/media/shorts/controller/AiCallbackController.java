package com.onetake.media.shorts.controller;

import com.onetake.media.shorts.dto.AiCallbackRequest;
import com.onetake.media.shorts.service.ShortsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI 서버 콜백 수신 API
 *
 * AI 서버가 숏츠 생성 완료 후 이 엔드포인트로 결과를 전송
 */
@Slf4j
@RestController
@RequestMapping("/api/callback")
@RequiredArgsConstructor
public class AiCallbackController {

    private final ShortsService shortsService;

    /**
     * AI 결과 콜백 수신
     *
     * POST /api/callback/ai-result
     */
    @PostMapping("/ai-result")
    public ResponseEntity<Map<String, String>> handleAiCallback(
            @RequestBody AiCallbackRequest request) {

        log.info("AI callback received: jobId={}, status={}",
                request.getJobId(), request.getStatus());

        try {
            shortsService.handleCallback(request);
            return ResponseEntity.ok(Map.of(
                    "status", "received",
                    "jobId", request.getJobId()
            ));
        } catch (Exception e) {
            log.error("Failed to process AI callback: jobId={}, error={}",
                    request.getJobId(), e.getMessage());
            return ResponseEntity.ok(Map.of(
                    "status", "error",
                    "jobId", request.getJobId(),
                    "message", e.getMessage()
            ));
        }
    }
}
