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
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public RecordingResponse startRecording(Long userId, RecordingStartRequest request) {
        // 이미 녹화 중인지 확인
        if (recordingSessionRepository.existsByStudioIdAndStatus(request.getStudioId(), RecordingStatus.RECORDING)) {
            throw new BusinessException(ErrorCode.RECORDING_ALREADY_IN_PROGRESS);
        }

        // 활성 스트림 세션 확인
        StreamSession streamSession = streamSessionRepository
                .findByStudioIdAndStatus(request.getStudioId(), SessionStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.STREAM_SESSION_NOT_FOUND));

        // 녹화 세션 생성
        String fileName = generateFileName(request.getStudioId(), request.getOutputFormat());

        RecordingSession recordingSession = RecordingSession.builder()
                .studioId(request.getStudioId())
                .userId(userId)
                .streamSessionId(streamSession.getId())
                .status(RecordingStatus.PENDING)
                .fileName(fileName)
                .build();

        // LiveKit Egress를 통한 녹화 시작
        String egressId = liveKitEgressService.startRoomCompositeRecording(streamSession.getRoomName(), fileName);
        recordingSession.startRecording(egressId);

        recordingSessionRepository.save(recordingSession);

        // 분당 댓글 수 집계 시작 (AI 하이라이트 추출용)
        commentCounterService.startCounting(request.getStudioId());

        log.info("Recording started: studioId={}, recordingId={}", request.getStudioId(), recordingSession.getRecordingId());

        return RecordingResponse.from(recordingSession);
    }

    @Transactional
    public RecordingResponse stopRecording(Long studioId) {
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
    public RecordingResponse pauseRecording(Long studioId) {
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
    public RecordingResponse resumeRecording(Long studioId) {
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
                .userId(recordingSession.getUserId())
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
        message.put("userId", String.valueOf(event.getUserId()));
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

    public RecordingResponse getActiveRecording(Long studioId) {
        RecordingSession recordingSession = recordingSessionRepository
                .findByStudioIdAndStatus(studioId, RecordingStatus.RECORDING)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_IN_PROGRESS));
        return RecordingResponse.from(recordingSession);
    }

    public List<RecordingResponse> getRecordingsByStudio(Long studioId) {
        return recordingSessionRepository.findByStudioIdOrderByCreatedAtDesc(studioId).stream()
                .map(RecordingResponse::from)
                .toList();
    }

    private String generateFileName(Long studioId, String format) {
        String timestamp = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String extension = format != null ? format : "mp4";
        return String.format("studio_%d_%s_%s.%s", studioId, timestamp, UUID.randomUUID().toString().substring(0, 8), extension);
    }
}
