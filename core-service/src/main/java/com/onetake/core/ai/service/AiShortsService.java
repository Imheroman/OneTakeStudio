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
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
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
    private final ObjectMapper objectMapper;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Value("${ai.webhook.url:http://localhost:8080/api/ai/webhook}")
    private String webhookUrl;

    @Value("${media.service.url:http://localhost:8082}")
    private String mediaServiceUrl;

    @Value("${storage.base-path:/mnt/storage}")
    private String storageBasePath;

    @Value("${recording.base-path:${storage.base-path:/mnt/storage}}")
    private String recordingBasePath;

    @Value("${ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    @Value("${core.external-url:http://localhost:8080}")
    private String coreExternalUrl;

    // 마커 기반 분할 설정
    private static final double SEGMENT_HALF_DURATION = 300.0;  // 마커 기준 앞뒤 5분씩 = 10분 구간
    private static final int MAX_SEGMENTS = 3;                   // 최대 3개 구간
    private static final double MIN_SPLIT_DURATION = 600.0;      // 10분 미만이면 분할하지 않음

    /**
     * Recording에서 AI 서버가 접근 가능한 파일 경로 추출
     * 공유 스토리지(NFS) 기준 절대 경로 반환
     */
    private String resolveFilePath(Recording recording) {
        // filePath가 절대 경로면 그대로 사용, 아니면 recordingBasePath 기준으로 조합
        String filePath = recording.getFilePath();
        if (filePath != null && filePath.startsWith("/")) {
            return filePath;
        }
        return recordingBasePath + "/" + (filePath != null ? filePath : recording.getFileName());
    }

    /**
     * Recording에서 영상 길이(초) 추출
     */
    private double resolveRecordingDuration(Recording recording) {
        return recording.getDurationSeconds() != null
                ? recording.getDurationSeconds().doubleValue()
                : 3600.0;  // 기본 1시간
    }

    /**
     * 쇼츠 생성 요청
     * - 마커가 있으면: 마커 기반으로 최대 3개 구간 분할
     * - 마커가 없으면: AI가 자동으로 하이라이트 선정
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

        boolean useTrim = request.getTrimStartSec() != null && request.getTrimEndSec() != null;
        List<VideoSegment> segments;
        boolean useMarkerMode = false;
        String trimmedFilePath = null;

        if (useTrim) {
            // 트림 모드: 선택 구간을 먼저 잘라서 임시 파일 생성
            double trimStart = request.getTrimStartSec();
            double trimEnd = request.getTrimEndSec();
            double trimmedDuration = trimEnd - trimStart;
            log.info("트림 모드: {}s ~ {}s ({}분)", trimStart, trimEnd, Math.round(trimmedDuration / 60));

            String trimDir = storageBasePath + "/temp/trim/" + UUID.randomUUID();
            new java.io.File(trimDir).mkdirs();
            trimmedFilePath = trimDir + "/trimmed.mp4";

            String cutResult = cutVideoSegment(resolveFilePath(recording), trimStart, trimEnd, trimmedFilePath);
            if (cutResult == null) {
                throw new IllegalStateException("트림 영상 생성에 실패했습니다.");
            }

            // 트림된 영상을 기준으로 segmentation (마커는 트림 시 비활성화)
            segments = calculateEvenSegmentsFromTrimmed(trimmedFilePath, trimmedDuration);
        } else {
            // 기존 로직: 마커 기반 또는 균등 분할
            List<MarkerInfo> markers = fetchMarkers(request.getRecordingId());
            log.info("마커 조회 결과: recordingId={}, 마커 수={}", request.getRecordingId(), markers.size());

            segments = calculateSegments(markers, recording);
            useMarkerMode = !segments.isEmpty();

            if (!useMarkerMode) {
                log.info("마커 없음 - 균등 분할 모드");
                segments = calculateEvenSegments(recording);
            }
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

        // 결과 슬롯 생성 (구간별 1개씩)
        for (VideoSegment segment : segments) {
            ShortsResult result = ShortsResult.builder()
                    .job(savedJob)
                    .videoId(segment.getVideoId())
                    .status(ShortsResultStatus.PENDING)
                    .build();
            shortsResultRepository.save(result);
        }

        // AI 서비스에 비동기 요청
        sendToAiService(savedJob, recording, segments, useMarkerMode);

        String message;
        if (useTrim) {
            message = String.format("트림 구간(%.0fs~%.0fs) 기반 %d개 구간 처리 시작",
                    request.getTrimStartSec(), request.getTrimEndSec(), segments.size());
        } else {
            message = useMarkerMode
                    ? String.format("마커 기반 %d개 구간 처리 시작", segments.size())
                    : "AI 자동 하이라이트 선정 모드로 처리 시작";
        }

        return ShortsGenerateResponse.builder()
                .jobId(savedJob.getJobId())
                .status("accepted")
                .message(message)
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
     * 마커 기반 영상 구간 계산 (최대 3개)
     * 각 마커 기준 앞뒤 5분씩 = 약 10분 구간
     * AI가 각 구간을 "전체 영상"으로 인식하고 90-120초 하이라이트 선택
     */
    private List<VideoSegment> calculateSegments(List<MarkerInfo> markers, Recording recording) {
        List<VideoSegment> segments = new ArrayList<>();

        if (markers.isEmpty()) {
            return segments;
        }

        // 영상 길이 (초)
        double recordingDuration = resolveRecordingDuration(recording);

        int count = 0;
        Set<Double> usedRanges = new HashSet<>();  // 중복 방지

        for (MarkerInfo marker : markers) {
            if (count >= MAX_SEGMENTS) break;
            if (marker.getTimestampSec() == null) continue;

            double markerTime = marker.getTimestampSec();

            // 시작/끝 계산 (마커 기준 앞뒤 5분씩 = 10분 구간)
            double startSec = Math.max(0, markerTime - SEGMENT_HALF_DURATION);
            double endSec = Math.min(recordingDuration, markerTime + SEGMENT_HALF_DURATION);

            // 최소 구간 길이 확보 (AI가 처리하려면 최소 2분 필요)
            if (endSec - startSec < 120) {
                double needed = 120 - (endSec - startSec);
                startSec = Math.max(0, startSec - needed / 2);
                endSec = Math.min(recordingDuration, endSec + needed / 2);
            }

            // 구간 겹침 체크 (3분 단위 그리드)
            double roundedStart = Math.floor(startSec / 180) * 180;
            if (usedRanges.contains(roundedStart)) continue;
            usedRanges.add(roundedStart);

            count++;
            segments.add(VideoSegment.builder()
                    .videoId("short_" + count)
                    .videoPath(resolveFilePath(recording))
                    .startSec(startSec)
                    .endSec(endSec)
                    .markerId(marker.getMarkerId())
                    .label(marker.getLabel())
                    .build());

            log.info("구간 추가: short_{}, start={}s, end={}s ({}분), label={}",
                    count, startSec, endSec, Math.round((endSec - startSec) / 60), marker.getLabel());
        }

        return segments;
    }

    /**
     * 마커가 없을 때 영상을 균등 분할 (항상 3개 구간)
     *
     * 스트리머 방송 특성상 영상 길이가 30분~12시간까지 다양하므로:
     * - 30분 미만: 전체 영상을 AI에 보내서 하이라이트 자동 선정 (1개)
     * - 30분 이상: 영상을 3등분 → 각 구간 중간 지점 기준 앞뒤 5분(10분) → FFmpeg 컷 → AI 전송
     *
     * AI 파이프라인이 각 세그먼트 내에서 자체적으로
     * 오디오 추출 → 전사 → LLM 하이라이트 선정 → 90~120초 쇼츠 생성
     */
    private List<VideoSegment> calculateEvenSegments(Recording recording) {
        List<VideoSegment> segments = new ArrayList<>();
        double duration = resolveRecordingDuration(recording);
        String filePath = resolveFilePath(recording);

        // 10분 미만: 분할하지 않고 전체 영상을 AI에 전송
        if (duration < MIN_SPLIT_DURATION) {
            segments.add(VideoSegment.builder()
                    .videoId("short_1")
                    .videoPath(filePath)
                    .build());
            log.info("짧은 영상({}분) - 전체 영상을 AI에 전송하여 하이라이트 자동 선정", Math.round(duration / 60));
            return segments;
        }

        // 10분 이상: 3등분하여 각 구간 전체를 AI에 전송
        double segmentDuration = duration / MAX_SEGMENTS;

        for (int i = 0; i < MAX_SEGMENTS; i++) {
            double startSec = segmentDuration * i;
            double endSec = (i == MAX_SEGMENTS - 1) ? duration : segmentDuration * (i + 1);

            segments.add(VideoSegment.builder()
                    .videoId("short_" + (i + 1))
                    .videoPath(filePath)
                    .startSec(startSec)
                    .endSec(endSec)
                    .build());

            log.info("균등 분할: short_{}, 구간 {}/3, range={}s~{}s ({}분)",
                    i + 1, i + 1,
                    Math.round(startSec), Math.round(endSec), Math.round((endSec - startSec) / 60));
        }

        return segments;
    }

    /**
     * 트림된 영상 파일 기준 균등 분할
     * 기존 calculateEvenSegments와 같은 로직이지만 트림된 파일 경로와 duration을 사용
     */
    private List<VideoSegment> calculateEvenSegmentsFromTrimmed(String trimmedFilePath, double duration) {
        List<VideoSegment> segments = new ArrayList<>();

        if (duration < MIN_SPLIT_DURATION) {
            segments.add(VideoSegment.builder()
                    .videoId("short_1")
                    .videoPath(trimmedFilePath)
                    .build());
            log.info("트림 영상({}분) - 전체를 AI에 전송", Math.round(duration / 60));
            return segments;
        }

        double segmentDuration = duration / MAX_SEGMENTS;
        for (int i = 0; i < MAX_SEGMENTS; i++) {
            double startSec = segmentDuration * i;
            double endSec = (i == MAX_SEGMENTS - 1) ? duration : segmentDuration * (i + 1);

            segments.add(VideoSegment.builder()
                    .videoId("short_" + (i + 1))
                    .videoPath(trimmedFilePath)
                    .startSec(startSec)
                    .endSec(endSec)
                    .build());

            log.info("트림 균등 분할: short_{}, range={}s~{}s ({}분)",
                    i + 1, Math.round(startSec), Math.round(endSec), Math.round((endSec - startSec) / 60));
        }

        return segments;
    }

    /**
     * FFmpeg로 영상 구간 잘라서 별도 파일로 저장
     * AI가 각 파일을 "전체 영상"으로 인식하도록 함
     */
    private String cutVideoSegment(String inputPath, double startSec, double endSec, String outputPath) {
        try {
            // FFmpeg 명령어: -ss (시작) -to (끝) -c copy (재인코딩 없이 빠르게)
            ProcessBuilder pb = new ProcessBuilder(
                    ffmpegPath, "-y",
                    "-ss", String.valueOf(startSec),
                    "-i", inputPath,
                    "-to", String.valueOf(endSec - startSec),  // 상대 시간
                    "-c", "copy",
                    "-avoid_negative_ts", "1",
                    outputPath
            );
            pb.redirectErrorStream(true);

            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                log.info("영상 분할 완료: {} ({}s ~ {}s)", outputPath, startSec, endSec);
                return outputPath;
            } else {
                log.error("FFmpeg 실패 (exit code: {})", exitCode);
                return null;
            }
        } catch (Exception e) {
            log.error("영상 분할 중 오류: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * AI 서비스에 요청 전송
     * - useMarkerMode=true: 영상을 실제로 잘라서 각각 전송 (마커 기반)
     * - useMarkerMode=false: 전체 영상 경로만 전송 (AI 자동 하이라이트)
     */
    private void sendToAiService(ShortsJob job, Recording recording, List<VideoSegment> segments, boolean useMarkerMode) {
        try {
            WebClient client = webClientBuilder.baseUrl(aiServiceUrl).build();

            // 임시 분할 파일 저장 경로
            String segmentDir = storageBasePath + "/temp/segments/" + job.getJobId();
            new java.io.File(segmentDir).mkdirs();

            // 영상 정보 구성
            List<Map<String, Object>> videos = new ArrayList<>();

            for (VideoSegment seg : segments) {
                Map<String, Object> video = new HashMap<>();
                video.put("video_id", seg.getVideoId());

                if (seg.getStartSec() != null && seg.getEndSec() != null) {
                    // 구간 분할: 영상을 실제로 잘라서 별도 파일로 저장
                    String segmentPath = segmentDir + "/" + seg.getVideoId() + ".mp4";
                    String cutPath = cutVideoSegment(
                            seg.getVideoPath(),
                            seg.getStartSec(),
                            seg.getEndSec(),
                            segmentPath
                    );

                    if (cutPath != null) {
                        video.put("video_path", cutPath);  // 잘린 파일 경로 (하위호환)
                        // HTTP 다운로드 URL 추가
                        String filename = seg.getVideoId() + ".mp4";
                        video.put("video_url", coreExternalUrl + "/api/ai/files/" + job.getJobId() + "/" + filename);
                        log.info("분할 영상 생성: {} ({}s ~ {}s) -> {}",
                                seg.getVideoId(), seg.getStartSec(), seg.getEndSec(), cutPath);
                    } else {
                        // 분할 실패 시 원본 경로 사용 (폴백)
                        video.put("video_path", seg.getVideoPath());
                        log.warn("분할 실패, 원본 사용: {}", seg.getVideoId());
                    }
                } else {
                    // 비분할: 원본을 segment 디렉토리에 복사하여 HTTP 다운로드 가능하게 함
                    try {
                        String segmentPath = segmentDir + "/" + seg.getVideoId() + ".mp4";
                        Files.copy(Path.of(seg.getVideoPath()), Path.of(segmentPath), StandardCopyOption.REPLACE_EXISTING);
                        video.put("video_url", coreExternalUrl + "/api/ai/files/" + job.getJobId() + "/" + seg.getVideoId() + ".mp4");
                        log.info("비분할 영상 복사: {} -> {}", seg.getVideoPath(), segmentPath);
                    } catch (Exception e) {
                        log.warn("비분할 영상 복사 실패, 원본 경로 사용: {}", e.getMessage());
                    }
                    video.put("video_path", seg.getVideoPath());
                }

                videos.add(video);
            }

            // AI 서비스 요청 페이로드 구성
            Map<String, Object> payload = new HashMap<>();
            payload.put("job_id", job.getJobId());
            payload.put("videos", videos);
            payload.put("need_subtitles", job.getNeedSubtitles());
            payload.put("subtitle_lang", job.getSubtitleLang());
            payload.put("upload_url", coreExternalUrl + "/api/ai/upload/" + job.getJobId());
            payload.put("output_dir", "./outputs/" + job.getJobId());  // AI 로컬 임시 경로
            payload.put("webhook_url", webhookUrl);

            log.info("AI 서비스 요청: jobId={}, mode={}, 영상 수={}",
                    job.getJobId(), useMarkerMode ? "마커 기반 분할" : "AI 자동", videos.size());

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
     * 숏츠 저장 (확정)
     */
    @Transactional
    public void saveShort(String jobId, String videoId) {
        ShortsJob job = shortsJobRepository.findByJobId(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job을 찾을 수 없습니다: " + jobId));

        ShortsResult result = shortsResultRepository.findByJobAndVideoId(job, videoId)
                .orElseThrow(() -> new IllegalArgumentException("결과를 찾을 수 없습니다: " + videoId));

        if (result.getStatus() != ShortsResultStatus.COMPLETED) {
            throw new IllegalStateException("완료된 숏츠만 저장할 수 있습니다.");
        }

        result.markSaved();
        shortsResultRepository.save(result);
        log.info("숏츠 저장 완료: jobId={}, videoId={}", jobId, videoId);
    }

    /**
     * 녹화별 저장된 숏츠 목록 조회
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSavedShorts(String recordingId) {
        List<ShortsResult> results = shortsResultRepository.findSavedByRecordingId(recordingId);

        return results.stream().map(r -> {
            Map<String, Object> item = new HashMap<>();
            item.put("jobId", r.getJob().getJobId());
            item.put("videoId", r.getVideoId());
            item.put("durationSec", r.getDurationSec());

            // titles JSON 파싱
            if (r.getTitles() != null) {
                try {
                    List<String> titles = objectMapper.readValue(r.getTitles(),
                            objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
                    item.put("titles", titles);
                } catch (Exception e) {
                    log.debug("titles JSON 파싱 실패: {}", e.getMessage());
                }
            }

            item.put("streamUrl", coreExternalUrl + "/api/ai/shorts/stream/" + r.getJob().getJobId() + "/" + r.getVideoId());
            item.put("downloadUrl", coreExternalUrl + "/api/ai/shorts/download/" + r.getJob().getJobId() + "/" + r.getVideoId());
            return item;
        }).collect(Collectors.toList());
    }

    /**
     * 숏츠 비디오 파일을 Resource로 반환
     */
    @Transactional(readOnly = true)
    public Resource getVideoResource(String jobId, String videoId) {
        ShortsJob job = shortsJobRepository.findByJobId(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job을 찾을 수 없습니다: " + jobId));

        ShortsResult result = shortsResultRepository.findByJobAndVideoId(job, videoId)
                .orElseThrow(() -> new IllegalArgumentException("결과를 찾을 수 없습니다: " + videoId));

        if (result.getOutputPath() == null) {
            throw new IllegalStateException("아직 생성이 완료되지 않았습니다: " + videoId);
        }

        java.io.File file = new java.io.File(result.getOutputPath());
        if (!file.exists()) {
            throw new IllegalStateException("비디오 파일을 찾을 수 없습니다: " + result.getOutputPath());
        }

        return new FileSystemResource(file);
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
                .map(r -> {
                    // highlight 정보
                    ShortsStatusResponse.HighlightInfo highlight = null;
                    if (r.getHighlightStartSec() != null || r.getHighlightEndSec() != null) {
                        highlight = ShortsStatusResponse.HighlightInfo.builder()
                                .startSec(r.getHighlightStartSec())
                                .endSec(r.getHighlightEndSec())
                                .reason(r.getHighlightReason())
                                .build();
                    }

                    // titles JSON 파싱
                    List<String> titles = null;
                    if (r.getTitles() != null) {
                        try {
                            titles = objectMapper.readValue(r.getTitles(),
                                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
                        } catch (Exception e) {
                            log.debug("titles JSON 파싱 실패: {}", e.getMessage());
                        }
                    }

                    return ShortsStatusResponse.ShortItem.builder()
                            .videoId(r.getVideoId())
                            .status(r.getStatus().name().toLowerCase())
                            .outputPath(r.getOutputPath())
                            .thumbnailPath(r.getThumbnailPath())
                            .streamUrl(coreExternalUrl + "/api/ai/shorts/stream/" + job.getJobId() + "/" + r.getVideoId())
                            .downloadUrl(coreExternalUrl + "/api/ai/shorts/download/" + job.getJobId() + "/" + r.getVideoId())
                            .durationSec(r.getDurationSec())
                            .resolution(r.getResolution())
                            .hasSubtitles(r.getHasSubtitles())
                            .highlight(highlight)
                            .titles(titles)
                            .processingTimeSec(r.getProcessingTimeSec())
                            .error(r.getErrorMessage())
                            .currentStep(r.getCurrentStep())
                            .totalSteps(r.getTotalSteps())
                            .currentStepKey(r.getCurrentStepKey())
                            .build();
                })
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
     * API 명세서 기준: status=success/error, data 구조 파싱
     */
    @Transactional
    public void handleWebhook(AiWebhookPayload payload) {
        log.info("AI Webhook 수신: jobId={}, videoId={}, status={}",
                payload.getJobId(), payload.getVideoId(), payload.getStatus());

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

        // summary 타입은 로그만 남기고 종료
        if ("summary".equals(payload.getType())) {
            log.info("Summary webhook 수신: jobId={}, totalTime={}",
                    payload.getJobId(), payload.getTotalProcessingTimeSec());
            return;
        }

        // progress 상태 처리
        if (payload.isProgress()) {
            result.updateProgress(payload.getStep(), payload.getTotalSteps(), payload.getStepKey());
            shortsResultRepository.save(result);

            // Job이 아직 PENDING이면 PROCESSING으로 전환
            if (job.getStatus() == ShortsJobStatus.PENDING) {
                job.setStatus(ShortsJobStatus.PROCESSING);
                shortsJobRepository.save(job);
            }

            log.info("쇼츠 진행 상황: jobId={}, videoId={}, step={}/{} ({})",
                    payload.getJobId(), payload.getVideoId(),
                    payload.getStep(), payload.getTotalSteps(), payload.getStepKey());
            return;
        }

        // success 또는 completed 모두 성공 처리
        if (payload.isSuccess()) {
            AiWebhookPayload.AiResultData data = payload.getResultData();

            if (data != null && data.getShortInfo() != null) {
                AiWebhookPayload.ShortInfo shortInfo = data.getShortInfo();
                AiWebhookPayload.HighlightInfo highlight = data.getHighlight();

                // titles를 JSON 문자열로 변환
                String titlesJson = null;
                if (data.getTitles() != null && !data.getTitles().isEmpty()) {
                    try {
                        titlesJson = objectMapper.writeValueAsString(data.getTitles());
                    } catch (Exception e) {
                        log.warn("titles JSON 변환 실패", e);
                    }
                }

                result.markCompletedWithDetails(
                        shortInfo.getFilePath(),
                        shortInfo.getDurationSec(),
                        shortInfo.getResolution(),
                        shortInfo.getHasSubtitles(),
                        highlight != null ? highlight.getStartSec() : null,
                        highlight != null ? highlight.getEndSec() : null,
                        highlight != null ? highlight.getReason() : null,
                        titlesJson,
                        payload.getProcessingTimeSec()
                );

                // 파일 크기 저장
                if (shortInfo.getFilePath() != null) {
                    File outputFile = new File(shortInfo.getFilePath());
                    if (outputFile.exists()) {
                        result.setFileSize(outputFile.length());
                    }
                }
            } else {
                // data가 없으면 기본 완료 처리
                result.markCompleted(null, payload.getProcessingTimeSec());
            }

            job.incrementCompleted();

            log.info("쇼츠 생성 완료: jobId={}, videoId={}, 진행률={}/{}",
                    payload.getJobId(), payload.getVideoId(),
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
            result.markError(payload.getErrorMessage());
            log.error("쇼츠 생성 실패: jobId={}, videoId={}, error={}",
                    payload.getJobId(), payload.getVideoId(), payload.getErrorMessage());
        }

        shortsResultRepository.save(result);
        shortsJobRepository.save(job);
    }

    /**
     * 미저장 숏츠 자동 정리
     * 24시간 이전 saved=false & status=COMPLETED 인 숏츠:
     * - 파일 삭제 (outputPath 기반)
     * - DB 상태를 EXPIRED로 변경
     */
    @org.springframework.scheduling.annotation.Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredShorts() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
        List<ShortsResult> expired = shortsResultRepository.findExpiredUnsaved(cutoff);

        if (expired.isEmpty()) {
            log.info("정리할 미저장 숏츠 없음");
            return;
        }

        log.info("미저장 숏츠 정리 시작: {}건", expired.size());

        for (ShortsResult result : expired) {
            if (result.getOutputPath() != null) {
                File file = new File(result.getOutputPath());
                if (file.exists()) {
                    boolean deleted = file.delete();
                    log.info("숏츠 파일 삭제 {}: {}", deleted ? "성공" : "실패", result.getOutputPath());
                }
            }
            result.setStatus(ShortsResultStatus.EXPIRED);
            result.setOutputPath(null);
            result.setFileSize(null);
        }

        shortsResultRepository.saveAll(expired);
        log.info("미저장 숏츠 정리 완료: {}건 처리", expired.size());
    }
}
