package com.onetake.media.recording.service;

import com.onetake.media.chat.service.CommentCounterService;
import com.onetake.media.global.config.RedisStreamConfig;
import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import com.onetake.media.recording.dto.RecordingResponse;
import com.onetake.media.recording.dto.RecordingStartRequest;
import com.onetake.media.recording.dto.RecordingStoppedEvent;
import com.onetake.media.recording.entity.RecordingSession;
import com.onetake.media.recording.entity.RecordingStatus;
import com.onetake.media.recording.repository.RecordingSessionRepository;
import com.onetake.media.stream.entity.SessionStatus;
import com.onetake.media.stream.entity.StreamSession;
import com.onetake.media.stream.repository.StreamSessionRepository;
import com.onetake.media.stream.service.LiveKitEgressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecordingService {

    private final RecordingSessionRepository recordingSessionRepository;
    private final StreamSessionRepository streamSessionRepository;
    private final StringRedisTemplate redisTemplate;
    private final LiveKitEgressService liveKitEgressService;
    private final CommentCounterService commentCounterService;
    private final ChunkedUploadService chunkedUploadService;
    private final LocalStorageService localStorageService;
    private final RestTemplate restTemplate;

    @Value("${core.service.url:http://localhost:8080}")
    private String coreServiceUrl;

    @Transactional
    public RecordingResponse startRecording(String odUserId, String studioId, RecordingStartRequest request) {
        // 이미 녹화 중인지 확인
        if (recordingSessionRepository.existsByStudioIdAndStatus(studioId, RecordingStatus.RECORDING)) {
            throw new BusinessException(ErrorCode.RECORDING_ALREADY_IN_PROGRESS);
        }

        // 활성 스트림 세션 확인
        StreamSession streamSession = streamSessionRepository
                .findByStudioIdAndStatus(studioId, SessionStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.STREAM_SESSION_NOT_FOUND));

        // 녹화 세션 생성 - 사용자별 디렉토리 사용
        // 사용자 스토리지 디렉토리 생성 (없으면 자동 생성)
        localStorageService.getUserStoragePath(odUserId);

        String baseFileName = generateFileName(studioId, request.getOutputFormat());
        String userFilePath = localStorageService.getUserFilePath(odUserId, baseFileName);

        RecordingSession recordingSession = RecordingSession.builder()
                .studioId(studioId)
                .odUserId(odUserId)
                .streamSessionId(streamSession.getId())
                .status(RecordingStatus.PENDING)
                .fileName(userFilePath)  // user-{userId}/filename.mp4 형식으로 저장
                .build();

        // LiveKit Egress를 통한 녹화 시작
        String egressId = liveKitEgressService.startRoomCompositeRecording(streamSession.getRoomName(), userFilePath);
        recordingSession.startRecording(egressId);

        recordingSessionRepository.save(recordingSession);

        // 분당 댓글 수 집계 시작 (AI 하이라이트 추출용)
        commentCounterService.startCounting(studioId);

        log.info("Recording started: studioId={}, recordingId={}", studioId, recordingSession.getRecordingId());

        return RecordingResponse.from(recordingSession);
    }

    @Transactional
    public RecordingResponse stopRecording(String studioId) {
        RecordingSession recordingSession = recordingSessionRepository
                .findByStudioIdAndStatus(studioId, RecordingStatus.RECORDING)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_IN_PROGRESS));

        // LiveKit Egress 중지
        liveKitEgressService.stopEgress(recordingSession.getEgressId());

        recordingSession.stopRecording();
        recordingSessionRepository.save(recordingSession);

        log.info("Recording stopped: studioId={}, recordingId={}", studioId, recordingSession.getRecordingId());

        return RecordingResponse.from(recordingSession);
    }

    @Transactional
    public RecordingResponse pauseRecording(String studioId) {
        RecordingSession recordingSession = recordingSessionRepository
                .findByStudioIdAndStatus(studioId, RecordingStatus.RECORDING)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_IN_PROGRESS));

        // LiveKit Egress 일시정지 (LiveKit SDK는 직접 pause를 지원하지 않으므로 상태만 관리)
        log.info("Pausing recording: egressId={}", recordingSession.getEgressId());

        recordingSession.pauseRecording();
        recordingSessionRepository.save(recordingSession);

        log.info("Recording paused: studioId={}, recordingId={}", studioId, recordingSession.getRecordingId());

        return RecordingResponse.from(recordingSession);
    }

    @Transactional
    public RecordingResponse resumeRecording(String studioId) {
        RecordingSession recordingSession = recordingSessionRepository
                .findByStudioIdAndStatus(studioId, RecordingStatus.PAUSED)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_PAUSED));

        // LiveKit Egress 재개 (LiveKit SDK는 직접 resume을 지원하지 않으므로 상태만 관리)
        log.info("Resuming recording: egressId={}", recordingSession.getEgressId());

        recordingSession.resumeRecording();
        recordingSessionRepository.save(recordingSession);

        log.info("Recording resumed: studioId={}, recordingId={}", studioId, recordingSession.getRecordingId());

        return RecordingResponse.from(recordingSession);
    }

    @Transactional
    public void completeRecording(Long recordingId, String filePath, String fileUrl, Long fileSize, Long durationSeconds) {
        RecordingSession recordingSession = recordingSessionRepository.findById(recordingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_FOUND));

        // 스토리지 용량 체크 (10GB 제한)
        checkStorageQuota(recordingSession.getOdUserId(), fileSize);

        recordingSession.complete(filePath, fileUrl, fileSize, durationSeconds);

        // 외부 EC2 업로드가 활성화된 경우 업로드 대기 상태로 설정
        if (chunkedUploadService.isUploadEnabled()) {
            recordingSession.initExternalUpload();
        }

        recordingSessionRepository.save(recordingSession);

        // 분당 댓글 수 저장 (AI 하이라이트 추출용)
        commentCounterService.saveAndStopCounting(recordingSession.getStudioId(), recordingId);

        // Core 서비스에 이벤트 발행 (Redis Streams 사용)
        RecordingStoppedEvent event = RecordingStoppedEvent.builder()
                .recordingId(recordingId)
                .studioId(recordingSession.getStudioId())
                .odUserId(recordingSession.getOdUserId())
                .filePath(filePath)
                .fileUrl(fileUrl)
                .fileSize(fileSize)
                .durationSeconds(durationSeconds)
                .stoppedAt(LocalDateTime.now())
                .build();

        publishRecordingStoppedEvent(event);

        // 외부 EC2 서버로 비동기 업로드 시작
        if (chunkedUploadService.isUploadEnabled()) {
            chunkedUploadService.uploadFileAsync(filePath, recordingId)
                    .thenAccept(externalUrl -> log.info("External upload completed: recordingId={}, externalUrl={}", recordingId, externalUrl))
                    .exceptionally(ex -> {
                        log.error("External upload failed: recordingId={}, error={}", recordingId, ex.getMessage());
                        return null;
                    });
        }

        log.info("Recording completed and event published: recordingId={}", recordingId);
    }

    /**
     * egressId로 녹화 세션 조회
     */
    public RecordingSession findByEgressId(String egressId) {
        return recordingSessionRepository.findByEgressId(egressId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_FOUND));
    }

    /**
     * Redis Streams를 통해 녹화 완료 이벤트 발행
     */
    private void publishRecordingStoppedEvent(RecordingStoppedEvent event) {
        Map<String, String> message = new HashMap<>();
        message.put("type", "RECORDING_STOPPED");
        message.put("recordingId", String.valueOf(event.getRecordingId()));
        message.put("studioId", String.valueOf(event.getStudioId()));
        message.put("odUserId", String.valueOf(event.getOdUserId()));
        message.put("filePath", event.getFilePath());
        message.put("fileUrl", event.getFileUrl());
        message.put("fileSize", String.valueOf(event.getFileSize()));
        message.put("durationSeconds", String.valueOf(event.getDurationSeconds()));
        message.put("stoppedAt", event.getStoppedAt().toString());

        redisTemplate.opsForStream().add(RedisStreamConfig.STREAM_KEY, message);

        log.info("Recording stopped event published to Redis Stream: recordingId={}", event.getRecordingId());
    }

    public RecordingResponse getRecordingByUuid(String recordingId) {
        RecordingSession recordingSession = recordingSessionRepository.findByRecordingId(recordingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_FOUND));
        return RecordingResponse.from(recordingSession);
    }

    public RecordingResponse getActiveRecording(String studioId) {
        RecordingSession recordingSession = recordingSessionRepository
                .findByStudioIdAndStatus(studioId, RecordingStatus.RECORDING)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_IN_PROGRESS));
        return RecordingResponse.from(recordingSession);
    }

    public List<RecordingResponse> getRecordingsByStudio(String studioId) {
        return recordingSessionRepository.findByStudioIdOrderByCreatedAtDesc(studioId).stream()
                .map(RecordingResponse::from)
                .toList();
    }

    private String generateFileName(String studioId, String format) {
        String timestamp = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String extension = format != null ? format : "mp4";
        return String.format("studio_%s_%s_%s.%s", studioId, timestamp, UUID.randomUUID().toString().substring(0, 8), extension);
    }

    /**
     * Core Service API를 통해 스토리지 용량 체크 (10GB 제한)
     * @param userId 사용자 ID
     * @param fileSize 파일 크기 (bytes)
     * @throws BusinessException 용량 초과 시
     */
    private void checkStorageQuota(String userId, Long fileSize) {
        if (fileSize == null || fileSize <= 0) {
            log.warn("Invalid file size for quota check: userId={}, fileSize={}", userId, fileSize);
            return;
        }

        String url = coreServiceUrl + "/api/storage/check-quota?userId={userId}&fileSize={fileSize}";

        try {
            restTemplate.postForObject(url, null, String.class, userId, fileSize);
            log.debug("Storage quota check passed: userId={}, fileSize={}bytes ({}GB)",
                    userId, fileSize, fileSize / (1024.0 * 1024.0 * 1024.0));
        } catch (HttpClientErrorException e) {
            log.error("Storage quota exceeded: userId={}, fileSize={}bytes, error={}",
                    userId, fileSize, e.getMessage());
            throw new BusinessException(ErrorCode.STORAGE_QUOTA_EXCEEDED);
        } catch (Exception e) {
            log.error("Failed to check storage quota: userId={}, fileSize={}", userId, fileSize, e);
            // 네트워크 오류 등의 경우 일단 허용 (관대한 정책)
            log.warn("Quota check failed, allowing upload due to service error");
        }
    }
}
