package com.onetake.media.stream.controller;

import com.onetake.media.publish.service.PublishService;
import com.onetake.media.recording.entity.RecordingSession;
import com.onetake.media.recording.service.LocalStorageService;
import com.onetake.media.recording.service.RecordingService;
import com.onetake.media.stream.service.LiveKitService;
import com.onetake.media.stream.service.StreamService;
import io.livekit.server.WebhookReceiver;
import livekit.LivekitWebhook;
import livekit.LivekitModels;
import livekit.LivekitEgress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * LiveKit Webhook 수신 Controller
 * - participant_joined: 세션 활성화 (CONNECTING → ACTIVE)
 * - participant_left: 참가자 퇴장 시 송출 종료 처리
 * - egress_started/ended: 녹화 상태 처리
 */
@Slf4j
@RestController
@RequestMapping("/api/media/webhook")
@RequiredArgsConstructor
public class LiveKitWebhookController {

    private final RecordingService recordingService;
    private final LocalStorageService localStorageService;
    private final StreamService streamService;
    private final PublishService publishService;
    private final LiveKitService liveKitService;
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
                case "participant_joined":
                    handleParticipantJoined(event);
                    break;
                case "participant_left":
                    handleParticipantLeft(event);
                    break;
                case "egress_started":
                    handleEgressStarted(event);
                    break;
                case "egress_ended":
                    handleEgressEnded(event);
                    break;
                case "room_finished":
                    handleRoomFinished(event);
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
     * 참가자 참여 이벤트 처리 - 세션 활성화
     */
    private void handleParticipantJoined(LivekitWebhook.WebhookEvent event) {
        if (!event.hasParticipant() || !event.hasRoom()) {
            return;
        }

        LivekitModels.ParticipantInfo participant = event.getParticipant();
        LivekitModels.Room room = event.getRoom();

        String roomName = room.getName();
        String participantIdentity = participant.getIdentity();

        log.info("Participant joined: roomName={}, identity={}", roomName, participantIdentity);

        // 세션 활성화
        streamService.activateSession(roomName, participantIdentity);
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
     * 참가자 퇴장 시 처리
     * Room에 참가자가 없으면 송출 종료
     */
    private void handleParticipantLeft(LivekitWebhook.WebhookEvent event) {
        if (event.getRoom() == null) {
            return;
        }

        String roomName = event.getRoom().getName();
        int numParticipants = event.getRoom().getNumParticipants();

        log.info("Participant left: room={}, remainingParticipants={}", roomName, numParticipants);

        // Room에 참가자가 없으면 송출 종료
        if (numParticipants == 0) {
            log.info("Room is empty, stopping publish: room={}", roomName);
            publishService.handleRoomEmpty(roomName);
        }
    }

    /**
     * Room 종료 시 처리
     */
    private void handleRoomFinished(LivekitWebhook.WebhookEvent event) {
        if (event.getRoom() == null) {
            return;
        }

        String roomName = event.getRoom().getName();
        log.info("Room finished: room={}", roomName);

        // 해당 Room의 송출 세션 종료
        publishService.handleRoomEmpty(roomName);
    }

    /**
     * Egress 종료 이벤트 처리 - 녹화/송출 완료 처리
     */
    private void handleEgressEnded(LivekitWebhook.WebhookEvent event) {
        if (!event.hasEgressInfo()) {
            return;
        }

        LivekitEgress.EgressInfo egressInfo = event.getEgressInfo();
        String egressId = egressInfo.getEgressId();
        LivekitEgress.EgressStatus status = egressInfo.getStatus();

        log.info("Egress ended: egressId={}, status={}", egressId, status);

        // 에러 메시지 추출
        String errorMessage = null;
        if (status == LivekitEgress.EgressStatus.EGRESS_FAILED ||
            status == LivekitEgress.EgressStatus.EGRESS_ABORTED) {
            errorMessage = egressInfo.getError();
            log.warn("Egress failed/aborted: egressId={}, error={}", egressId, errorMessage);
        }

        // 1. Publish 세션 처리 (RTMP 송출)
        try {
            publishService.handleEgressEnded(egressId, errorMessage);
        } catch (Exception e) {
            log.debug("No publish session for egressId: {}", egressId);
        }

        // 2. Recording 세션 처리 (녹화)
        try {
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
            log.debug("No recording session for egressId: {}", egressId);
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
