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
import org.springframework.web.multipart.MultipartFile;

import livekit.LivekitEgress;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

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
    private final PlatformTransactionManager transactionManager;

    @Value("${core.service.url:http://localhost:8080}")
    private String coreServiceUrl;

    @Value("${livekit.egress.output-path:/recordings/}")
    private String egressOutputPath;

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

        // Webhook 미수신 대비: 비동기로 egress 완료 상태를 폴링하여 녹화 완료 처리
        final Long recordingId = recordingSession.getId();
        final String egressId = recordingSession.getEgressId();
        CompletableFuture.runAsync(() ->
                pollAndCompleteRecording(recordingId, egressId));

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

        // 이미 완료된 녹화는 중복 처리 방지
        if (recordingSession.getStatus() == RecordingStatus.COMPLETED) {
            log.info("Recording already completed, skipping: recordingId={}", recordingId);
            return;
        }

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

        // Core 서비스에 알림 (HTTP 우선, 실패 시 Redis fallback)
        String recordingName = "스트리밍 녹화 - " + LocalDateTime.now().format(
                java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

        RecordingStoppedEvent event = RecordingStoppedEvent.builder()
                .recordingId(recordingId)
                .studioId(recordingSession.getStudioId())
                .odUserId(recordingSession.getOdUserId())
                .filePath(filePath)
                .fileUrl(fileUrl)
                .fileSize(fileSize)
                .durationSeconds(durationSeconds)
                .recordingName(recordingName)
                .stoppedAt(LocalDateTime.now())
                .build();

        if (!notifyCoreServiceRecordingCompleted(event)) {
            // HTTP 실패 시에만 Redis Stream fallback
            publishRecordingStoppedEvent(event);
        }

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
     * 사용자 영상 파일 수동 업로드
     */
    @Transactional
    public RecordingResponse uploadRecording(String odUserId, String studioId, String title, Long durationSeconds, MultipartFile file) {
        long fileSize = file.getSize();

        // 스토리지 용량 체크
        checkStorageQuota(odUserId, fileSize);

        // 사용자 디렉토리 생성
        localStorageService.getUserStoragePath(odUserId);

        // 파일 저장
        String originalName = file.getOriginalFilename();
        String extension = "mp4";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf('.') + 1);
        }
        String baseFileName = generateFileName(studioId, extension);
        String userFilePath = localStorageService.getUserFilePath(odUserId, baseFileName);

        try {
            localStorageService.saveFile(userFilePath, file.getInputStream());
        } catch (IOException e) {
            log.error("파일 업로드 실패: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.FILE_STORAGE_ERROR);
        }

        String fileUrl = localStorageService.getFileUrl(userFilePath);

        // RecordingSession 생성 (COMPLETED 상태)
        RecordingSession recordingSession = RecordingSession.builder()
                .studioId(studioId)
                .odUserId(odUserId)
                .status(RecordingStatus.COMPLETED)
                .fileName(userFilePath)
                .filePath(userFilePath)
                .fileUrl(fileUrl)
                .fileSize(fileSize)
                .durationSeconds(durationSeconds)
                .startedAt(LocalDateTime.now())
                .endedAt(LocalDateTime.now())
                .build();

        recordingSessionRepository.save(recordingSession);

        // Core Service에 이벤트 발행 (라이브러리에 표시)
        RecordingStoppedEvent event = RecordingStoppedEvent.builder()
                .recordingId(recordingSession.getId())
                .studioId(studioId)
                .odUserId(odUserId)
                .filePath(userFilePath)
                .fileUrl(fileUrl)
                .fileSize(fileSize)
                .durationSeconds(durationSeconds)
                .recordingName(title)
                .stoppedAt(LocalDateTime.now())
                .build();

        if (!notifyCoreServiceRecordingCompleted(event)) {
            publishRecordingStoppedEvent(event);
        }

        log.info("영상 업로드 완료: recordingId={}, studioId={}, fileName={}",
                recordingSession.getRecordingId(), studioId, baseFileName);

        return RecordingResponse.from(recordingSession);
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
        if (event.getStudioId() != null) {
            message.put("studioId", event.getStudioId());
        }
        message.put("odUserId", String.valueOf(event.getOdUserId()));
        message.put("userId", String.valueOf(event.getOdUserId()));
        message.put("filePath", event.getFilePath());
        message.put("fileUrl", event.getFileUrl());
        message.put("fileSize", String.valueOf(event.getFileSize()));
        message.put("durationSeconds", String.valueOf(event.getDurationSeconds()));
        if (event.getRecordingName() != null) {
            message.put("recordingName", event.getRecordingName());
        }
        message.put("stoppedAt", event.getStoppedAt().toString());

        redisTemplate.opsForStream().add(RedisStreamConfig.STREAM_KEY, message);

        log.info("Recording stopped event published to Redis Stream: recordingId={}", event.getRecordingId());
    }

    /**
     * Core Service 내부 API를 직접 호출하여 Recording 엔티티 생성
     * @return 성공 시 true, 실패 시 false
     */
    private boolean notifyCoreServiceRecordingCompleted(RecordingStoppedEvent event) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("mediaRecordingId", event.getRecordingId());
            body.put("userId", event.getOdUserId());
            body.put("studioId", event.getStudioId());
            body.put("title", event.getRecordingName());
            body.put("filePath", event.getFilePath());
            body.put("fileUrl", event.getFileUrl());
            body.put("fileSize", event.getFileSize());
            body.put("durationSeconds", event.getDurationSeconds());

            String url = coreServiceUrl + "/api/internal/library/recordings";
            restTemplate.postForObject(url, body, String.class);

            log.info("Core Service 내부 API로 녹화 등록 완료: mediaRecordingId={}", event.getRecordingId());
            return true;
        } catch (Exception e) {
            log.warn("Core Service 내부 API 호출 실패 (Redis Stream fallback): mediaRecordingId={}, error={}",
                    event.getRecordingId(), e.getMessage());
            return false;
        }
    }

    /**
     * Webhook 미수신 대비: egress 완료 상태를 폴링하여 녹화 완료 처리
     */
    private void pollAndCompleteRecording(Long recordingId, String egressId) {
        try {
            for (int attempt = 0; attempt < 10; attempt++) {
                Thread.sleep(3000); // 3초 간격 폴링

                // webhook이 먼저 처리했는지 확인
                RecordingSession session = recordingSessionRepository.findById(recordingId).orElse(null);
                if (session == null || session.getStatus() == RecordingStatus.COMPLETED) {
                    log.info("녹화 이미 완료됨 (webhook 처리): recordingId={}", recordingId);
                    return;
                }

                try {
                    LivekitEgress.EgressInfo egressInfo = liveKitEgressService.getEgressInfo(egressId);
                    LivekitEgress.EgressStatus status = egressInfo.getStatus();

                    if (status == LivekitEgress.EgressStatus.EGRESS_COMPLETE) {
                        log.info("Egress 완료 확인 (폴링 fallback): egressId={}", egressId);
                        completeRecordingFromEgress(recordingId, egressInfo);
                        return;
                    } else if (status == LivekitEgress.EgressStatus.EGRESS_FAILED ||
                               status == LivekitEgress.EgressStatus.EGRESS_ABORTED) {
                        log.error("Egress 실패/중단: egressId={}, error={}", egressId, egressInfo.getError());
                        return;
                    }

                    log.debug("Egress 진행 중: egressId={}, status={}, attempt={}/10", egressId, status, attempt + 1);
                } catch (Exception e) {
                    log.warn("Egress 상태 조회 실패: egressId={}, attempt={}/10, error={}", egressId, attempt + 1, e.getMessage());
                }
            }
            log.warn("Egress 폴링 타임아웃 (30초): egressId={}, recordingId={}", egressId, recordingId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Egress 폴링 인터럽트: recordingId={}", recordingId);
        }
    }

    /**
     * Egress 정보로부터 녹화 완료 처리 (폴링 fallback용)
     */
    private void completeRecordingFromEgress(Long recordingId, LivekitEgress.EgressInfo egressInfo) {
        String filePath = null;
        long fileSize = 0;
        long durationSeconds = 0;

        if (egressInfo.hasFile()) {
            LivekitEgress.FileInfo fileInfo = egressInfo.getFile();
            filePath = fileInfo.getFilename();
            fileSize = fileInfo.getSize();
            durationSeconds = fileInfo.getDuration() / 1_000_000_000;
        } else if (egressInfo.getFileResultsCount() > 0) {
            LivekitEgress.FileInfo fileInfo = egressInfo.getFileResults(0);
            filePath = fileInfo.getFilename();
            fileSize = fileInfo.getSize();
            durationSeconds = fileInfo.getDuration() / 1_000_000_000;
        }

        if (filePath == null) {
            log.warn("Egress 결과에 파일 정보 없음: egressId={}", egressInfo.getEgressId());
            return;
        }

        String fileName = extractRelativePathFromEgress(filePath);
        String fileUrl = localStorageService.getFileUrl(fileName);

        final String fp = fileName;
        final String fu = fileUrl;
        final long fs = fileSize;
        final long ds = durationSeconds;

        try {
            new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                    completeRecording(recordingId, fp, fu, fs, ds)
            );
            log.info("녹화 완료 처리 성공 (폴링 fallback): recordingId={}", recordingId);
        } catch (Exception e) {
            log.error("녹화 완료 처리 실패 (폴링 fallback): recordingId={}, error={}", recordingId, e.getMessage(), e);
        }
    }

    /**
     * Egress 파일 경로에서 상대 경로 추출
     * 예: /recordings/user-123/file.mp4 -> user-123/file.mp4
     */
    private String extractRelativePathFromEgress(String absolutePath) {
        if (absolutePath == null) return null;
        String normalizedPath = egressOutputPath.endsWith("/") ? egressOutputPath : egressOutputPath + "/";
        if (absolutePath.startsWith(normalizedPath)) {
            return absolutePath.substring(normalizedPath.length());
        }
        int lastSlash = Math.max(absolutePath.lastIndexOf('/'), absolutePath.lastIndexOf('\\'));
        return lastSlash >= 0 ? absolutePath.substring(lastSlash + 1) : absolutePath;
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
        String prefix = (studioId != null && !studioId.isBlank()) ? "studio_" + studioId : "upload";
        return String.format("%s_%s_%s.%s", prefix, timestamp, UUID.randomUUID().toString().substring(0, 8), extension);
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
            if (e.getStatusCode().value() == 409) {
                // 409 Conflict = 실제 용량 초과
                log.error("Storage quota exceeded: userId={}, fileSize={}bytes, error={}",
                        userId, fileSize, e.getMessage());
                throw new BusinessException(ErrorCode.STORAGE_QUOTA_EXCEEDED);
            }
            // 401, 403 등 인증/권한 오류는 관대하게 허용
            log.warn("Quota check returned {}, allowing upload: userId={}", e.getStatusCode(), userId);
        } catch (Exception e) {
            log.error("Failed to check storage quota: userId={}, fileSize={}", userId, fileSize, e);
            // 네트워크 오류 등의 경우 일단 허용 (관대한 정책)
            log.warn("Quota check failed, allowing upload due to service error");
        }
    }
}
