package com.onetake.media.stream.controller;

import com.onetake.media.recording.entity.RecordingSession;
import com.onetake.media.recording.service.LocalStorageService;
import com.onetake.media.recording.service.RecordingService;
import io.livekit.server.WebhookReceiver;
import livekit.LivekitWebhook;
import livekit.LivekitEgress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * LiveKit Webhook 수신 Controller
 * Egress 완료 이벤트 처리
 */
@Slf4j
@RestController
@RequestMapping("/api/media/webhook")
@RequiredArgsConstructor
public class LiveKitWebhookController {

    private final RecordingService recordingService;
    private final LocalStorageService localStorageService;
    private final WebhookReceiver webhookReceiver;

    @Value("${recording.storage.base-url:http://localhost:8082/api/recordings/files}")
    private String baseUrl;

    /**
     * LiveKit Webhook 수신
     */
    @PostMapping("/livekit")
    public ResponseEntity<String> handleLiveKitWebhook(
            @RequestBody String body,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        try {
            // Webhook 검증 및 파싱
            LivekitWebhook.WebhookEvent event = webhookReceiver.receive(body, authHeader);

            log.info("LiveKit webhook received: event={}", event.getEvent());

            // 이벤트 타입별 처리
            switch (event.getEvent()) {
                case "egress_started":
                    handleEgressStarted(event);
                    break;
                case "egress_ended":
                    handleEgressEnded(event);
                    break;
                default:
                    log.debug("Unhandled webhook event: {}", event.getEvent());
            }

            return ResponseEntity.ok("OK");

        } catch (Exception e) {
            log.error("Failed to process LiveKit webhook", e);
            return ResponseEntity.ok("OK"); // LiveKit은 200 OK를 기대
        }
    }

    /**
     * Egress 시작 이벤트 처리
     */
    private void handleEgressStarted(LivekitWebhook.WebhookEvent event) {
        if (!event.hasEgressInfo()) {
            return;
        }

        LivekitEgress.EgressInfo egressInfo = event.getEgressInfo();
        log.info("Egress started: egressId={}, roomName={}",
                egressInfo.getEgressId(), egressInfo.getRoomName());
    }

    /**
     * Egress 종료 이벤트 처리 - 녹화 완료 처리
     */
    private void handleEgressEnded(LivekitWebhook.WebhookEvent event) {
        if (!event.hasEgressInfo()) {
            return;
        }

        LivekitEgress.EgressInfo egressInfo = event.getEgressInfo();
        String egressId = egressInfo.getEgressId();

        log.info("Egress ended: egressId={}, status={}", egressId, egressInfo.getStatus());

        try {
            // 녹화 세션 조회
            RecordingSession recordingSession = recordingService.findByEgressId(egressId);

            // 파일 정보 추출
            String filePath = null;
            String fileName = null;
            long fileSize = 0;
            long durationSeconds = 0;

            // File 결과 확인
            if (egressInfo.hasFile()) {
                LivekitEgress.FileInfo fileInfo = egressInfo.getFile();
                filePath = fileInfo.getFilename();
                fileName = extractFileName(filePath);
                fileSize = fileInfo.getSize();
                durationSeconds = fileInfo.getDuration() / 1_000_000_000; // 나노초 -> 초
            }
            // FileResults 확인 (여러 파일)
            else if (egressInfo.getFileResultsCount() > 0) {
                LivekitEgress.FileInfo fileInfo = egressInfo.getFileResults(0);
                filePath = fileInfo.getFilename();
                fileName = extractFileName(filePath);
                fileSize = fileInfo.getSize();
                durationSeconds = fileInfo.getDuration() / 1_000_000_000;
            }

            if (fileName == null) {
                log.warn("No file info in egress result: egressId={}", egressId);
                return;
            }

            // 파일 URL 생성
            String fileUrl = localStorageService.getFileUrl(fileName);

            // 녹화 완료 처리
            recordingService.completeRecording(
                    recordingSession.getId(),
                    filePath,
                    fileUrl,
                    fileSize,
                    durationSeconds
            );

            log.info("Recording completed via webhook: egressId={}, fileName={}, size={}, duration={}s",
                    egressId, fileName, fileSize, durationSeconds);

        } catch (Exception e) {
            log.error("Failed to process egress ended event: egressId={}", egressId, e);
        }
    }

    /**
     * 전체 경로에서 파일명만 추출
     */
    private String extractFileName(String filePath) {
        if (filePath == null) {
            return null;
        }
        int lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
    }
}
