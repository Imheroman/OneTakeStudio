package com.onetake.media.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.chat.entity.CommentStats;
import com.onetake.media.chat.repository.CommentStatsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 분당 댓글 수 집계 서비스
 *
 * 방송 중 실시간으로 분당 댓글 수를 집계하고,
 * 방송 종료 시 DB에 저장합니다.
 *
 * 사용 흐름:
 * 1. 방송 시작: startCounting(studioId)
 * 2. 댓글 수신: incrementCount(studioId)
 * 3. 방송 종료: saveAndStopCounting(studioId, recordingId)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommentCounterService {

    private final CommentStatsRepository commentStatsRepository;
    private final ObjectMapper objectMapper;

    /**
     * 스튜디오별 카운터 정보
     * - startTime: 방송 시작 시간
     * - counts: 분당 카운트 리스트
     */
    private final Map<Long, CounterInfo> counters = new ConcurrentHashMap<>();

    /**
     * 방송 시작 시 카운터 초기화
     */
    public void startCounting(Long studioId) {
        counters.put(studioId, new CounterInfo());
        log.info("[CommentCounter] Started counting for studioId={}", studioId);
    }

    /**
     * 댓글 수신 시 카운트 증가
     * 현재 시간 기준으로 몇 분째인지 계산하여 해당 인덱스 증가
     */
    public void incrementCount(Long studioId) {
        CounterInfo info = counters.get(studioId);
        if (info == null) {
            // 카운터가 없으면 자동 시작 (안전장치)
            log.warn("[CommentCounter] Counter not found for studioId={}, auto-starting", studioId);
            startCounting(studioId);
            info = counters.get(studioId);
        }

        int minuteIndex = info.getCurrentMinuteIndex();
        info.ensureCapacity(minuteIndex + 1);
        info.getCounts().get(minuteIndex).incrementAndGet();

        log.debug("[CommentCounter] Incremented count for studioId={}, minute={}", studioId, minuteIndex);
    }

    /**
     * 현재 집계 중인 카운트 조회 (디버깅/모니터링용)
     */
    public List<Integer> getCurrentCounts(Long studioId) {
        CounterInfo info = counters.get(studioId);
        if (info == null) {
            return List.of();
        }
        return info.getCountsAsIntList();
    }

    /**
     * 방송 종료 시 카운트 저장 및 정리
     */
    @Transactional
    public CommentStats saveAndStopCounting(Long studioId, Long recordingId) {
        CounterInfo info = counters.remove(studioId);
        if (info == null) {
            log.warn("[CommentCounter] No counter found for studioId={}", studioId);
            return null;
        }

        List<Integer> counts = info.getCountsAsIntList();
        int totalCount = counts.stream().mapToInt(Integer::intValue).sum();
        int durationMinutes = counts.size();

        String countsJson;
        try {
            countsJson = objectMapper.writeValueAsString(counts);
        } catch (JsonProcessingException e) {
            log.error("[CommentCounter] Failed to serialize counts", e);
            countsJson = "[]";
        }

        CommentStats stats = CommentStats.builder()
                .recordingId(recordingId)
                .studioId(studioId)
                .countsJson(countsJson)
                .durationMinutes(durationMinutes)
                .totalCount(totalCount)
                .build();

        CommentStats saved = commentStatsRepository.save(stats);

        log.info("[CommentCounter] Saved comment stats: studioId={}, recordingId={}, duration={}min, total={}",
                studioId, recordingId, durationMinutes, totalCount);

        return saved;
    }

    /**
     * 카운터 강제 중지 (저장 없이)
     */
    public void stopCounting(Long studioId) {
        CounterInfo removed = counters.remove(studioId);
        if (removed != null) {
            log.info("[CommentCounter] Stopped counting for studioId={} (without saving)", studioId);
        }
    }

    /**
     * 카운터 활성 여부 확인
     */
    public boolean isCountingActive(Long studioId) {
        return counters.containsKey(studioId);
    }

    /**
     * 내부 카운터 정보 클래스
     */
    private static class CounterInfo {
        private final LocalDateTime startTime;
        private final List<AtomicInteger> counts;

        public CounterInfo() {
            this.startTime = LocalDateTime.now();
            this.counts = new ArrayList<>();
            this.counts.add(new AtomicInteger(0)); // 0분 초기화
        }

        public int getCurrentMinuteIndex() {
            long minutes = Duration.between(startTime, LocalDateTime.now()).toMinutes();
            return (int) Math.max(0, minutes);
        }

        public void ensureCapacity(int size) {
            while (counts.size() < size) {
                counts.add(new AtomicInteger(0));
            }
        }

        public List<AtomicInteger> getCounts() {
            return counts;
        }

        public List<Integer> getCountsAsIntList() {
            return counts.stream()
                    .map(AtomicInteger::get)
                    .toList();
        }
    }
}
