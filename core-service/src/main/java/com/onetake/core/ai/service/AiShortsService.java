package com.onetake.core.ai.service;

import com.onetake.core.ai.dto.*;
import com.onetake.core.ai.entity.*;
import com.onetake.core.ai.repository.ShortsJobRepository;
import com.onetake.core.ai.repository.ShortsResultRepository;
import com.onetake.core.library.entity.Recording;
import com.onetake.core.library.repository.RecordingRepository;
import com.onetake.core.notification.entity.Notification;
import com.onetake.core.notification.service.NotificationService;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiShortsService {

    private final ShortsJobRepository shortsJobRepository;
    private final ShortsResultRepository shortsResultRepository;
    private final RecordingRepository recordingRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final WebClient.Builder webClientBuilder;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Value("${ai.webhook.url:http://localhost:8080/api/ai/webhook}")
    private String webhookUrl;

    @Value("${storage.base-path:/mnt/storage}")
    private String storageBasePath;

    /**
     * 쇼츠 생성 요청
     */
    @Transactional
    public ShortsGenerateResponse requestGeneration(String userId, ShortsGenerateRequest request) {
        log.info("쇼츠 생성 요청: userId={}, recordingId={}", userId, request.getRecordingId());

        // 사용자 조회
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 녹화 파일 조회
        Recording recording = recordingRepository.findByRecordingId(request.getRecordingId())
                .orElseThrow(() -> new IllegalArgumentException("녹화 파일을 찾을 수 없습니다."));

        // Job 생성
        ShortsJob job = ShortsJob.builder()
                .userId(user.getId())
                .recordingId(request.getRecordingId())
                .needSubtitles(request.isNeedSubtitles())
                .subtitleLang(request.getSubtitleLang())
                .totalCount(3)
                .build();

        ShortsJob savedJob = shortsJobRepository.save(job);

        // 결과 슬롯 미리 생성 (3개)
        for (int i = 1; i <= 3; i++) {
            ShortsResult result = ShortsResult.builder()
                    .job(savedJob)
                    .videoId("short_" + i)
                    .status(ShortsResultStatus.PENDING)
                    .build();
            shortsResultRepository.save(result);
        }

        // AI 서비스에 비동기 요청
        sendToAiService(savedJob, recording);

        return ShortsGenerateResponse.builder()
                .jobId(savedJob.getJobId())
                .status("accepted")
                .message("쇼츠 생성이 시작되었습니다. 완료 시 알림을 보내드립니다.")
                .build();
    }

    /**
     * 쇼츠 상태 조회
     */
    @Transactional(readOnly = true)
    public ShortsStatusResponse getStatus(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 가장 최근 Job 조회
        ShortsJob job = shortsJobRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId())
                .orElse(null);

        if (job == null) {
            return ShortsStatusResponse.builder()
                    .status("idle")
                    .totalCount(0)
                    .completedCount(0)
                    .build();
        }

        List<ShortsResult> results = shortsResultRepository.findByJobOrderByCreatedAtAsc(job);

        List<ShortsStatusResponse.ShortItem> items = results.stream()
                .map(r -> ShortsStatusResponse.ShortItem.builder()
                        .videoId(r.getVideoId())
                        .status(r.getStatus().name().toLowerCase())
                        .outputPath(r.getOutputPath())
                        .thumbnailPath(r.getThumbnailPath())
                        .processingTimeSec(r.getProcessingTimeSec())
                        .error(r.getErrorMessage())
                        .build())
                .collect(Collectors.toList());

        return ShortsStatusResponse.builder()
                .jobId(job.getJobId())
                .status(job.getStatus().name().toLowerCase())
                .totalCount(job.getTotalCount())
                .completedCount(job.getCompletedCount())
                .shorts(items)
                .build();
    }

    /**
     * 특정 Job 상태 조회
     */
    @Transactional(readOnly = true)
    public ShortsStatusResponse getJobStatus(String jobId) {
        ShortsJob job = shortsJobRepository.findByJobId(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job을 찾을 수 없습니다."));

        List<ShortsResult> results = shortsResultRepository.findByJobOrderByCreatedAtAsc(job);

        List<ShortsStatusResponse.ShortItem> items = results.stream()
                .map(r -> ShortsStatusResponse.ShortItem.builder()
                        .videoId(r.getVideoId())
                        .status(r.getStatus().name().toLowerCase())
                        .outputPath(r.getOutputPath())
                        .thumbnailPath(r.getThumbnailPath())
                        .processingTimeSec(r.getProcessingTimeSec())
                        .error(r.getErrorMessage())
                        .build())
                .collect(Collectors.toList());

        return ShortsStatusResponse.builder()
                .jobId(job.getJobId())
                .status(job.getStatus().name().toLowerCase())
                .totalCount(job.getTotalCount())
                .completedCount(job.getCompletedCount())
                .shorts(items)
                .build();
    }

    /**
     * AI 서비스 Webhook 처리
     */
    @Transactional
    public void handleWebhook(AiWebhookPayload payload) {
        log.info("AI Webhook 수신: jobId={}, videoId={}, status={}",
                payload.getJobId(), payload.getVideoId(), payload.getStatus());

        // summary 타입이면 무시 (개별 완료 알림으로 처리)
        if ("summary".equals(payload.getType())) {
            log.info("Summary webhook 수신: jobId={}, totalTime={}",
                    payload.getJobId(), payload.getTotalProcessingTimeSec());
            return;
        }

        ShortsJob job = shortsJobRepository.findByJobId(payload.getJobId())
                .orElse(null);

        if (job == null) {
            log.warn("Job을 찾을 수 없음: jobId={}", payload.getJobId());
            return;
        }

        // 해당 결과 업데이트
        ShortsResult result = shortsResultRepository.findByJobAndVideoId(job, payload.getVideoId())
                .orElse(null);

        if (result == null) {
            log.warn("Result를 찾을 수 없음: jobId={}, videoId={}", payload.getJobId(), payload.getVideoId());
            return;
        }

        if ("completed".equals(payload.getStatus())) {
            // 결과에서 output_path 추출
            String outputPath = null;
            if (payload.getResult() != null) {
                outputPath = (String) payload.getResult().get("output_video");
            }

            result.markCompleted(outputPath, payload.getProcessingTimeSec());
            job.incrementCompleted();

            log.info("쇼츠 생성 완료: jobId={}, videoId={}, outputPath={}",
                    payload.getJobId(), payload.getVideoId(), outputPath);

            // 알림 생성
            User user = userRepository.findById(job.getUserId()).orElse(null);
            if (user != null) {
                Notification notification = Notification.builder()
                        .user(user)
                        .type(Notification.NotificationType.AI_SHORTS)
                        .title("AI 쇼츠 생성 완료")
                        .message(job.getCompletedCount() + "번째 쇼츠가 생성되었습니다!")
                        .referenceId(job.getJobId())
                        .build();
                notificationService.createNotification(notification);
            }

        } else if ("error".equals(payload.getStatus())) {
            result.markError(payload.getError());
            log.error("쇼츠 생성 실패: jobId={}, videoId={}, error={}",
                    payload.getJobId(), payload.getVideoId(), payload.getError());
        }

        shortsResultRepository.save(result);
        shortsJobRepository.save(job);
    }

    /**
     * AI 서비스에 요청 전송
     */
    private void sendToAiService(ShortsJob job, Recording recording) {
        try {
            WebClient client = webClientBuilder.baseUrl(aiServiceUrl).build();

            // AI 서비스 요청 페이로드 구성
            Map<String, Object> payload = Map.of(
                    "job_id", job.getJobId(),
                    "videos", List.of(Map.of(
                            "video_id", "short_1",
                            "video_path", recording.getFilePath()
                    )),
                    "need_subtitles", job.getNeedSubtitles(),
                    "subtitle_lang", job.getSubtitleLang(),
                    "output_dir", storageBasePath + "/shorts/" + job.getJobId(),
                    "webhook_url", webhookUrl
            );

            client.post()
                    .uri("/shorts/process")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .subscribe(
                            response -> {
                                log.info("AI 서비스 요청 성공: jobId={}, response={}", job.getJobId(), response);
                                job.setStatus(ShortsJobStatus.PROCESSING);
                                shortsJobRepository.save(job);
                            },
                            error -> {
                                log.error("AI 서비스 요청 실패: jobId={}, error={}", job.getJobId(), error.getMessage());
                                job.markError("AI 서비스 연결 실패: " + error.getMessage());
                                shortsJobRepository.save(job);
                            }
                    );

        } catch (Exception e) {
            log.error("AI 서비스 요청 중 예외 발생: jobId={}", job.getJobId(), e);
            job.markError("요청 처리 중 오류: " + e.getMessage());
            shortsJobRepository.save(job);
        }
    }
}
