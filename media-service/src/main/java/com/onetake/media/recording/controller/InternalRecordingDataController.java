package com.onetake.media.recording.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.chat.entity.CommentStats;
import com.onetake.media.chat.repository.CommentStatsRepository;
import com.onetake.media.marker.entity.Marker;
import com.onetake.media.marker.repository.MarkerRepository;
import com.onetake.media.recording.entity.RecordingSession;
import com.onetake.media.recording.repository.RecordingSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Core Service에서 호출하는 내부 API
 * 댓글 분석, 마커 데이터 제공
 */
@Slf4j
@RestController
@RequestMapping("/api/media/internal/recordings")
@RequiredArgsConstructor
public class InternalRecordingDataController {

    private final CommentStatsRepository commentStatsRepository;
    private final MarkerRepository markerRepository;
    private final RecordingSessionRepository recordingSessionRepository;
    private final ObjectMapper objectMapper;

    /**
     * 댓글 분석 데이터 조회 (분당 댓글 수)
     * @param mediaRecordingId Media Service의 RecordingSession Long ID
     */
    @GetMapping("/{mediaRecordingId}/comment-stats")
    public ResponseEntity<Map<String, Object>> getCommentStats(
            @PathVariable Long mediaRecordingId) {

        Optional<CommentStats> statsOpt = commentStatsRepository.findByRecordingId(mediaRecordingId);
        if (statsOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "recordingId", mediaRecordingId,
                    "durationSeconds", 0,
                    "buckets", List.of()
            ));
        }

        CommentStats stats = statsOpt.get();
        List<Map<String, Object>> buckets = new ArrayList<>();

        try {
            List<Integer> counts = objectMapper.readValue(
                    stats.getCountsJson(), new TypeReference<List<Integer>>() {});

            for (int i = 0; i < counts.size(); i++) {
                Map<String, Object> bucket = new HashMap<>();
                bucket.put("timeSec", i * 60); // 분 → 초
                bucket.put("count", counts.get(i));
                buckets.add(bucket);
            }
        } catch (JsonProcessingException e) {
            log.error("Failed to parse countsJson for recordingId={}", mediaRecordingId, e);
        }

        int durationSeconds = stats.getDurationMinutes() != null ? stats.getDurationMinutes() * 60 : 0;

        Map<String, Object> result = new HashMap<>();
        result.put("recordingId", mediaRecordingId);
        result.put("durationSeconds", durationSeconds);
        result.put("buckets", buckets);

        return ResponseEntity.ok(result);
    }

    /**
     * 마커(북마크) 목록 조회
     * @param mediaRecordingId Media Service의 RecordingSession Long ID
     */
    @GetMapping("/{mediaRecordingId}/markers")
    public ResponseEntity<Map<String, Object>> getMarkers(
            @PathVariable Long mediaRecordingId) {

        // RecordingSession의 recordingId(UUID)를 찾아서 마커 조회
        Optional<RecordingSession> sessionOpt = recordingSessionRepository.findById(mediaRecordingId);
        if (sessionOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("markers", List.of()));
        }

        String recordingUuid = sessionOpt.get().getRecordingId();
        List<Marker> markers = markerRepository.findByRecordingIdOrderByTimestampSecAsc(recordingUuid);

        List<Map<String, Object>> markerList = markers.stream().map(m -> {
            Map<String, Object> map = new HashMap<>();
            map.put("markerId", m.getMarkerId());
            map.put("recordingId", m.getRecordingId());
            map.put("timestampSec", m.getTimestampSec() != null ? m.getTimestampSec() : 0);
            map.put("label", m.getLabel());
            return map;
        }).toList();

        return ResponseEntity.ok(Map.of("markers", markerList));
    }
}
