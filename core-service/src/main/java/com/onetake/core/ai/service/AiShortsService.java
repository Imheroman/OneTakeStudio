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
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;
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

    @Value("${media.service.url:http://localhost:8082}")
    private String mediaServiceUrl;

    @Value("${storage.base-path:/mnt/storage}")
    private String storageBasePath;

    // 구간 설정
    private static final double SEGMENT_DURATION = 60.0;  // 각 구간 60초
    private static final double SEGMENT_PADDING = 30.0;   // 마커 앞뒤 패딩

    /**
     * 쇼츠 생성 요청 (마커 기반)
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

        // Media Service에서 마커 조회
        List<MarkerInfo> markers = fetchMarkers(request.getRecordingId());
        log.info("마커 조회 결과: recordingId={}, 마커 수={}", request.getRecordingId(), markers.size());

        // 마커 기반 영상 구간 계산 (최대 3개)
        List<VideoSegment> segments = calculateSegments(markers, recording, 3);

        if (segments.isEmpty()) {
            // 마커가 없으면 영상 전체를 AI에게 맡김 (하이라이트 자동 선정)
            log.info("마커 없음 - AI 자동 하이라이트 선정 모드");
            segments = List.of(VideoSegment.builder()
                    .videoId("short_1")
                    .videoPath(recording.getS3Url())
                    .startSec(0.0)
                    .endSec(null)  // null이면 전체 영상
                    .build());
        }

        // Job 생성
        ShortsJob job = ShortsJob.builder()
                .userId(user.getId())
                .recordingId(request.getRecordingId())
                .needSubtitles(request.isNeedSubtitles())
                .subtitleLang(request.getSubtitleLang())
                .totalCount(segments.size())
                .build();

        ShortsJob savedJob = shortsJobRepository.save(job);

        // 결과 슬롯 생성
        for (VideoSegment segment : segments) {
            ShortsResult result = ShortsResult.builder()
                    .job(savedJob)
                    .videoId(segment.getVideoId())
                    .status(ShortsResultStatus.PENDING)
                    .build();
            shortsResultRepository.save(result);
        }

        // AI 서비스에 비동기 요청
        sendToAiService(savedJob, recording, segments);

        return ShortsGenerateResponse.builder()
                .jobId(savedJob.getJobId())
                .status("accepted")
                .message(String.format("쇼츠 생성이 시작되었습니다. %d개의 구간을 처리합니다.", segments.size()))
                .build();
    }

    /**
     * Media Service에서 마커 조회
     */
    private List<MarkerInfo> fetchMarkers(String recordingId) {
        try {
            WebClient client = webClientBuilder.baseUrl(mediaServiceUrl).build();

            Map<String, Object> response = client.get()
                    .uri("/api/media/markers/recording/{recordingId}", recordingId)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (response != null && response.containsKey("data")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
                return data.stream()
                        .map(this::mapToMarkerInfo)
                        .sorted(Comparator.comparingDouble(m ->
                            m.getChatSpikeRatio() != null ? -m.getChatSpikeRatio() : 0))  // 급증률 높은 순
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.warn("마커 조회 실패 (Media Service 연결 오류): {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    private MarkerInfo mapToMarkerInfo(Map<String, Object> map) {
        MarkerInfo info = new MarkerInfo();
        // Reflection 없이 수동 매핑 (간단한 방법)
        try {
            var field = MarkerInfo.class.getDeclaredField("markerId");
            field.setAccessible(true);
            field.set(info, (String) map.get("markerId"));

            field = MarkerInfo.class.getDeclaredField("timestampSec");
            field.setAccessible(true);
            Object ts = map.get("timestampSec");
            field.set(info, ts instanceof Number ? ((Number) ts).doubleValue() : null);

            field = MarkerInfo.class.getDeclaredField("chatSpikeRatio");
            field.setAccessible(true);
            Object ratio = map.get("chatSpikeRatio");
            field.set(info, ratio instanceof Number ? ((Number) ratio).doubleValue() : null);

            field = MarkerInfo.class.getDeclaredField("label");
            field.setAccessible(true);
            field.set(info, (String) map.get("label"));
        } catch (Exception e) {
            log.debug("마커 매핑 오류: {}", e.getMessage());
        }
        return info;
    }

    /**
     * 마커 기반 영상 구간 계산
     */
    private List<VideoSegment> calculateSegments(List<MarkerInfo> markers, Recording recording, int maxCount) {
        List<VideoSegment> segments = new ArrayList<>();

        // 영상 길이 (초) - 없으면 기본값
        Integer durationSec = recording.getDurationSeconds();
        Double recordingDuration = durationSec != null ? durationSec.doubleValue() : 3600.0;

        int count = 0;
        Set<Double> usedRanges = new HashSet<>();  // 중복 방지

        for (MarkerInfo marker : markers) {
            if (count >= maxCount) break;
            if (marker.getTimestampSec() == null) continue;

            double markerTime = marker.getTimestampSec();

            // 시작/끝 계산 (마커 기준 ±패딩)
            double startSec = Math.max(0, markerTime - SEGMENT_PADDING);
            double endSec = Math.min(recordingDuration, markerTime + SEGMENT_PADDING + SEGMENT_DURATION);

            // 구간 겹침 체크 (간단히 시작점으로 체크)
            double roundedStart = Math.floor(startSec / 30) * 30;  // 30초 단위로 반올림
            if (usedRanges.contains(roundedStart)) continue;
            usedRanges.add(roundedStart);

            count++;
            segments.add(VideoSegment.builder()
                    .videoId("short_" + count)
                    .videoPath(recording.getS3Url())
                    .startSec(startSec)
                    .endSec(endSec)
                    .markerId(marker.getMarkerId())
                    .label(marker.getLabel())
                    .build());

            log.info("구간 추가: short_{}, start={}, end={}, label={}",
                    count, startSec, endSec, marker.getLabel());
        }

        return segments;
    }

    /**
     * AI 서비스에 요청 전송
     */
    private void sendToAiService(ShortsJob job, Recording recording, List<VideoSegment> segments) {
        try {
            WebClient client = webClientBuilder.baseUrl(aiServiceUrl).build();

            // 영상 구간 정보 구성
            List<Map<String, Object>> videos = segments.stream()
                    .map(seg -> {
                        Map<String, Object> video = new HashMap<>();
                        video.put("video_id", seg.getVideoId());
                        video.put("video_path", seg.getVideoPath());
                        if (seg.getStartSec() != null) {
                            video.put("start_sec", seg.getStartSec());
                        }
                        if (seg.getEndSec() != null) {
                            video.put("end_sec", seg.getEndSec());
                        }
                        return video;
                    })
                    .collect(Collectors.toList());

            // AI 서비스 요청 페이로드 구성
            Map<String, Object> payload = new HashMap<>();
            payload.put("job_id", job.getJobId());
            payload.put("videos", videos);
            payload.put("need_subtitles", job.getNeedSubtitles());
            payload.put("subtitle_lang", job.getSubtitleLang());
            payload.put("output_dir", storageBasePath + "/shorts/" + job.getJobId());
            payload.put("webhook_url", webhookUrl);

            log.info("AI 서비스 요청: jobId={}, 구간 수={}", job.getJobId(), videos.size());

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

    /**
     * 쇼츠 상태 조회
     */
    @Transactional(readOnly = true)
    public ShortsStatusResponse getStatus(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        ShortsJob job = shortsJobRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId())
                .orElse(null);

        if (job == null) {
            return ShortsStatusResponse.builder()
                    .status("idle")
                    .totalCount(0)
                    .completedCount(0)
                    .build();
        }

        return buildStatusResponse(job);
    }

    /**
     * 특정 Job 상태 조회
     */
    @Transactional(readOnly = true)
    public ShortsStatusResponse getJobStatus(String jobId) {
        ShortsJob job = shortsJobRepository.findByJobId(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job을 찾을 수 없습니다."));

        return buildStatusResponse(job);
    }

    private ShortsStatusResponse buildStatusResponse(ShortsJob job) {
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

        ShortsResult result = shortsResultRepository.findByJobAndVideoId(job, payload.getVideoId())
                .orElse(null);

        if (result == null) {
            log.warn("Result를 찾을 수 없음: jobId={}, videoId={}", payload.getJobId(), payload.getVideoId());
            return;
        }

        if ("completed".equals(payload.getStatus())) {
            String outputPath = null;
            if (payload.getResult() != null) {
                outputPath = (String) payload.getResult().get("output_video");
            }

            result.markCompleted(outputPath, payload.getProcessingTimeSec());
            job.incrementCompleted();

            log.info("쇼츠 생성 완료: jobId={}, videoId={}, outputPath={}, 진행률={}/{}",
                    payload.getJobId(), payload.getVideoId(), outputPath,
                    job.getCompletedCount(), job.getTotalCount());

            // 알림 생성
            User user = userRepository.findById(job.getUserId()).orElse(null);
            if (user != null) {
                Notification notification = Notification.builder()
                        .user(user)
                        .type(Notification.NotificationType.AI_SHORTS)
                        .title("AI 쇼츠 생성 완료")
                        .message(job.getCompletedCount() + "/" + job.getTotalCount() + " 쇼츠가 생성되었습니다!")
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
}
