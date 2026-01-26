package com.onetakestudio.mediaservice.recording.service;

import com.onetakestudio.mediaservice.global.config.RabbitConfig;
import com.onetakestudio.mediaservice.global.exception.BusinessException;
import com.onetakestudio.mediaservice.global.exception.ErrorCode;
import com.onetakestudio.mediaservice.recording.dto.RecordingResponse;
import com.onetakestudio.mediaservice.recording.dto.RecordingStartRequest;
import com.onetakestudio.mediaservice.recording.dto.RecordingStoppedEvent;
import com.onetakestudio.mediaservice.recording.entity.RecordingSession;
import com.onetakestudio.mediaservice.recording.entity.RecordingStatus;
import com.onetakestudio.mediaservice.recording.repository.RecordingSessionRepository;
import com.onetakestudio.mediaservice.stream.entity.SessionStatus;
import com.onetakestudio.mediaservice.stream.entity.StreamSession;
import com.onetakestudio.mediaservice.stream.repository.StreamSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecordingService {

    private final RecordingSessionRepository recordingSessionRepository;
    private final StreamSessionRepository streamSessionRepository;
    private final RabbitTemplate rabbitTemplate;

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

        // LiveKit Egress를 통한 녹화 시작 (여기서는 시뮬레이션)
        String egressId = startLiveKitEgress(streamSession.getRoomName(), fileName);
        recordingSession.startRecording(egressId);

        recordingSessionRepository.save(recordingSession);

        log.info("Recording started: studioId={}, recordingId={}", request.getStudioId(), recordingSession.getId());

        return RecordingResponse.from(recordingSession);
    }

    @Transactional
    public RecordingResponse stopRecording(Long studioId) {
        RecordingSession recordingSession = recordingSessionRepository
                .findByStudioIdAndStatus(studioId, RecordingStatus.RECORDING)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_IN_PROGRESS));

        // LiveKit Egress 중지
        stopLiveKitEgress(recordingSession.getLivekitEgressId());

        recordingSession.stopRecording();
        recordingSessionRepository.save(recordingSession);

        log.info("Recording stopped: studioId={}, recordingId={}", studioId, recordingSession.getId());

        return RecordingResponse.from(recordingSession);
    }

    @Transactional
    public RecordingResponse pauseRecording(Long studioId) {
        RecordingSession recordingSession = recordingSessionRepository
                .findByStudioIdAndStatus(studioId, RecordingStatus.RECORDING)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_IN_PROGRESS));

        // LiveKit Egress 일시정지
        pauseLiveKitEgress(recordingSession.getLivekitEgressId());

        recordingSession.pauseRecording();
        recordingSessionRepository.save(recordingSession);

        log.info("Recording paused: studioId={}, recordingId={}", studioId, recordingSession.getId());

        return RecordingResponse.from(recordingSession);
    }

    @Transactional
    public RecordingResponse resumeRecording(Long studioId) {
        RecordingSession recordingSession = recordingSessionRepository
                .findByStudioIdAndStatus(studioId, RecordingStatus.PAUSED)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_PAUSED));

        // LiveKit Egress 재개
        resumeLiveKitEgress(recordingSession.getLivekitEgressId());

        recordingSession.resumeRecording();
        recordingSessionRepository.save(recordingSession);

        log.info("Recording resumed: studioId={}, recordingId={}", studioId, recordingSession.getId());

        return RecordingResponse.from(recordingSession);
    }

    @Transactional
    public void completeRecording(Long recordingId, String s3Key, String s3Url, Long fileSize, Long durationSeconds) {
        RecordingSession recordingSession = recordingSessionRepository.findById(recordingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_FOUND));

        recordingSession.complete(s3Key, s3Url, fileSize, durationSeconds);
        recordingSessionRepository.save(recordingSession);

        // Core 서비스에 이벤트 발행
        RecordingStoppedEvent event = RecordingStoppedEvent.builder()
                .recordingId(recordingId)
                .studioId(recordingSession.getStudioId())
                .userId(recordingSession.getUserId())
                .s3Key(s3Key)
                .s3Url(s3Url)
                .fileSize(fileSize)
                .durationSeconds(durationSeconds)
                .stoppedAt(LocalDateTime.now())
                .build();

        rabbitTemplate.convertAndSend(
                RabbitConfig.EXCHANGE_NAME,
                RabbitConfig.RECORDING_STOPPED_ROUTING_KEY,
                event
        );

        log.info("Recording completed and event published: recordingId={}", recordingId);
    }

    public RecordingResponse getRecording(Long recordingId) {
        RecordingSession recordingSession = recordingSessionRepository.findById(recordingId)
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

    private String startLiveKitEgress(String roomName, String fileName) {
        // TODO: LiveKit Egress API 연동
        // RoomCompositeEgressRequest를 사용하여 녹화 시작
        log.info("Starting LiveKit Egress for room: {}, file: {}", roomName, fileName);
        return "egress-" + UUID.randomUUID();
    }

    private void stopLiveKitEgress(String egressId) {
        // TODO: LiveKit Egress API 연동
        // StopEgress를 호출하여 녹화 중지
        log.info("Stopping LiveKit Egress: {}", egressId);
    }

    private void pauseLiveKitEgress(String egressId) {
        // TODO: LiveKit Egress API 연동
        // PauseEgress를 호출하여 녹화 일시정지
        log.info("Pausing LiveKit Egress: {}", egressId);
    }

    private void resumeLiveKitEgress(String egressId) {
        // TODO: LiveKit Egress API 연동
        // ResumeEgress를 호출하여 녹화 재개
        log.info("Resuming LiveKit Egress: {}", egressId);
    }
}
