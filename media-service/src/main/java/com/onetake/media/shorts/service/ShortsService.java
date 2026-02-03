package com.onetake.media.shorts.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.chat.entity.CommentStats;
import com.onetake.media.chat.repository.CommentStatsRepository;
import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import com.onetake.media.recording.entity.RecordingSession;
import com.onetake.media.recording.repository.RecordingSessionRepository;
import com.onetake.media.shorts.client.AiServiceClient;
import com.onetake.media.shorts.dto.*;
import com.onetake.media.shorts.entity.ShortsJob;
import com.onetake.media.shorts.entity.ShortsStatus;
import com.onetake.media.shorts.repository.ShortsJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * AI 숏츠 생성 서비스
 *
 * 흐름:
 * 1. createShorts() - 작업 생성 + AI 서버 요청
 * 2. AI 서버에서 처리 (비동기)
 * 3. handleCallback() - 결과 수신 및 저장
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShortsService {

    private final ShortsJobRepository shortsJobRepository;
    private final RecordingSessionRepository recordingSessionRepository;
    private final CommentStatsRepository commentStatsRepository;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;

    @Value("${ai.service.webhook-url:http://localhost:8082/api/callback/ai-result}")
    private String webhookUrl;

    @Value("${ai.service.output-dir:/mnt/share/output/shorts}")
    private String outputDir;

    @Value("${recording.storage.base-url:http://localhost:8082/api/recordings/files}")
    private String storageBaseUrl;

    /**
     * 숏츠 생성 요청
     */
    @Transactional
    public ShortsResponse createShorts(Long userId, ShortsCreateRequest request) {
        // 녹화 정보 조회
        RecordingSession recording = recordingSessionRepository.findById(request.getRecordingId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_FOUND));

        // 이미 진행 중인 작업이 있는지 확인
        if (shortsJobRepository.existsByRecordingIdAndStatusIn(
                request.getRecordingId(),
                List.of(ShortsStatus.PENDING, ShortsStatus.PROCESSING))) {
            throw new BusinessException(ErrorCode.SHORTS_ALREADY_IN_PROGRESS);
        }

        // 작업 ID 생성
        String jobId = generateJobId(request.getRecordingId());

        // 작업 생성
        ShortsJob job = ShortsJob.builder()
                .jobId(jobId)
                .recordingId(request.getRecordingId())
                .studioId(recording.getStudioId())
                .userId(userId)
                .status(ShortsStatus.PENDING)
                .videoPath(recording.getFilePath())
                .needSubtitles(request.getNeedSubtitles())
                .subtitleLang(request.getSubtitleLang())
                .build();

        shortsJobRepository.save(job);

        // 분당 댓글 수 조회
        List<Integer> commentCounts = getCommentCounts(request.getRecordingId());

        // AI 서버 요청 생성
        AiShortsRequest aiRequest = AiShortsRequest.builder()
                .jobId(jobId)
                .videos(List.of(
                        AiShortsRequest.VideoInfo.builder()
                                .videoId(String.valueOf(request.getRecordingId()))
                                .videoPath(recording.getFilePath())
                                .build()
                ))
                .commentCountsPerMinute(commentCounts)
                .needSubtitles(request.getNeedSubtitles())
                .subtitleLang(request.getSubtitleLang())
                .outputDir(outputDir)
                .webhookUrl(webhookUrl)
                .build();

        // AI 서버 요청
        boolean success = aiServiceClient.requestShortsGeneration(aiRequest);

        if (success) {
            job.startProcessing();
            log.info("Shorts generation started: jobId={}, recordingId={}",
                    jobId, request.getRecordingId());
        } else {
            job.fail("Failed to request AI service");
            log.error("Failed to start shorts generation: jobId={}", jobId);
        }

        return ShortsResponse.from(job);
    }

    /**
     * AI 콜백 처리
     */
    @Transactional
    public void handleCallback(AiCallbackRequest callback) {
        log.info("AI callback received: jobId={}, status={}",
                callback.getJobId(), callback.getStatus());

        ShortsJob job = shortsJobRepository.findByJobId(callback.getJobId())
                .orElseThrow(() -> {
                    log.error("Job not found for callback: jobId={}", callback.getJobId());
                    return new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
                });

        if ("success".equals(callback.getStatus())) {
            handleSuccess(job, callback);
        } else {
            handleFailure(job, callback);
        }
    }

    /**
     * 작업 조회
     */
    public ShortsResponse getJob(String jobId) {
        ShortsJob job = shortsJobRepository.findByJobId(jobId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return ShortsResponse.from(job);
    }

    /**
     * 녹화별 작업 목록 조회
     */
    public List<ShortsResponse> getJobsByRecording(Long recordingId) {
        return shortsJobRepository.findByRecordingIdOrderByCreatedAtDesc(recordingId)
                .stream()
                .map(ShortsResponse::from)
                .toList();
    }

    /**
     * 스튜디오별 작업 목록 조회
     */
    public List<ShortsResponse> getJobsByStudio(Long studioId) {
        return shortsJobRepository.findByStudioIdOrderByCreatedAtDesc(studioId)
                .stream()
                .map(ShortsResponse::from)
                .toList();
    }

    /**
     * 사용자별 작업 목록 조회
     */
    public List<ShortsResponse> getJobsByUser(Long userId) {
        return shortsJobRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(ShortsResponse::from)
                .toList();
    }

    // === Private Methods ===

    private String generateJobId(Long recordingId) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        return String.format("job_%s_%d", timestamp, recordingId);
    }

    private List<Integer> getCommentCounts(Long recordingId) {
        return commentStatsRepository.findByRecordingId(recordingId)
                .map(stats -> parseCountsJson(stats.getCountsJson()))
                .orElse(List.of());
    }

    private List<Integer> parseCountsJson(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Integer.class));
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse comment counts JSON: {}", e.getMessage());
            return List.of();
        }
    }

    private void handleSuccess(ShortsJob job, AiCallbackRequest callback) {
        AiCallbackRequest.ResultData data = callback.getData();

        if (data == null || data.getShortInfo() == null) {
            job.fail("Invalid callback data: missing short info");
            return;
        }

        // 제목 JSON 변환
        String titlesJson = null;
        if (data.getTitles() != null && !data.getTitles().isEmpty()) {
            try {
                titlesJson = objectMapper.writeValueAsString(data.getTitles());
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize titles: {}", e.getMessage());
            }
        }

        // URL 생성
        String outputUrl = generateOutputUrl(data.getShortInfo().getFilePath());

        // 하이라이트 정보
        Double startSec = null, endSec = null;
        String reason = null;
        if (data.getHighlight() != null) {
            startSec = data.getHighlight().getStartSec();
            endSec = data.getHighlight().getEndSec();
            reason = data.getHighlight().getReason();
        }

        job.complete(
                data.getShortInfo().getFilePath(),
                outputUrl,
                data.getShortInfo().getDurationSec(),
                startSec,
                endSec,
                reason,
                titlesJson
        );

        log.info("Shorts generation completed: jobId={}, outputUrl={}",
                job.getJobId(), outputUrl);
    }

    private void handleFailure(ShortsJob job, AiCallbackRequest callback) {
        String error = callback.getError() != null ? callback.getError() : "Unknown error";
        job.fail(error);

        log.error("Shorts generation failed: jobId={}, error={}", job.getJobId(), error);
    }

    private String generateOutputUrl(String filePath) {
        if (filePath == null) {
            return null;
        }
        // 파일명 추출
        int lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        String fileName = lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
        return storageBaseUrl + "/shorts/" + fileName;
    }
}
