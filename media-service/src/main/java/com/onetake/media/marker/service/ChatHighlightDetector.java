package com.onetake.media.marker.service;

import com.onetake.media.chat.entity.ChatMessage;
import com.onetake.media.chat.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 채팅 급증 감지 서비스
 * - 윈도우 슬라이싱으로 실시간 채팅 트래픽 분석
 * - 평균 대비 N배 이상 급증 시 자동 마커 생성
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatHighlightDetector {

    private final ChatMessageRepository chatMessageRepository;
    private final MarkerService markerService;

    // 스튜디오별 채팅 카운트 윈도우 (studioId -> 시간대별 채팅 수)
    private final Map<Long, LinkedList<ChatWindow>> chatWindows = new ConcurrentHashMap<>();

    // 이미 마킹된 시간대 (중복 방지)
    private final Map<Long, Set<Long>> markedTimestamps = new ConcurrentHashMap<>();

    // 설정
    private static final int WINDOW_SIZE_SECONDS = 10;      // 윈도우 크기 (10초)
    private static final int LOOKBACK_WINDOWS = 30;          // 분석할 윈도우 수 (5분)
    private static final double SPIKE_THRESHOLD = 2.5;       // 급증 임계값 (평균 대비 2.5배)
    private static final int MIN_CHAT_COUNT = 10;            // 최소 채팅 수 (노이즈 필터)

    /**
     * 채팅 메시지 추가 (실시간 호출)
     */
    public void onChatMessage(Long studioId, String recordingId) {
        long currentWindow = System.currentTimeMillis() / (WINDOW_SIZE_SECONDS * 1000);

        chatWindows.computeIfAbsent(studioId, k -> new LinkedList<>());
        LinkedList<ChatWindow> windows = chatWindows.get(studioId);

        synchronized (windows) {
            // 현재 윈도우 찾거나 생성
            ChatWindow current = windows.isEmpty() ? null : windows.getLast();
            if (current == null || current.windowId != currentWindow) {
                current = new ChatWindow(currentWindow, recordingId);
                windows.addLast(current);

                // 오래된 윈도우 제거
                while (windows.size() > LOOKBACK_WINDOWS) {
                    windows.removeFirst();
                }
            }
            current.count++;
        }
    }

    /**
     * 주기적 급증 체크 (10초마다)
     */
    @Scheduled(fixedRate = 10000)
    public void checkForSpikes() {
        for (Map.Entry<Long, LinkedList<ChatWindow>> entry : chatWindows.entrySet()) {
            Long studioId = entry.getKey();
            LinkedList<ChatWindow> windows = entry.getValue();

            if (windows.size() < 3) continue;  // 최소 데이터 필요

            synchronized (windows) {
                // 평균 계산 (마지막 윈도우 제외)
                double sum = 0;
                int count = 0;
                String recordingId = null;

                for (int i = 0; i < windows.size() - 1; i++) {
                    ChatWindow w = windows.get(i);
                    sum += w.count;
                    count++;
                    if (w.recordingId != null) {
                        recordingId = w.recordingId;
                    }
                }

                if (count == 0) continue;
                double average = sum / count;

                // 마지막 윈도우 체크
                ChatWindow lastWindow = windows.getLast();
                if (lastWindow.count < MIN_CHAT_COUNT) continue;

                double ratio = average > 0 ? lastWindow.count / average : lastWindow.count;

                if (ratio >= SPIKE_THRESHOLD) {
                    // 중복 체크
                    Set<Long> marked = markedTimestamps.computeIfAbsent(studioId, k -> new HashSet<>());
                    if (!marked.contains(lastWindow.windowId)) {
                        marked.add(lastWindow.windowId);

                        // 타임스탬프 계산 (녹화 시작 기준)
                        double timestampSec = lastWindow.windowId * WINDOW_SIZE_SECONDS;

                        log.info("🔥 채팅 급증 감지! studioId={}, ratio={}, count={}",
                                studioId, String.format("%.1f", ratio), lastWindow.count);

                        // 마커 생성
                        if (recordingId != null) {
                            markerService.createChatSpikeMarker(studioId, recordingId, timestampSec, ratio);
                        }
                    }
                }
            }
        }
    }

    /**
     * 스튜디오 세션 종료 시 정리
     */
    public void clearStudio(Long studioId) {
        chatWindows.remove(studioId);
        markedTimestamps.remove(studioId);
    }

    /**
     * 채팅 윈도우 데이터
     */
    private static class ChatWindow {
        final long windowId;
        final String recordingId;
        int count = 0;

        ChatWindow(long windowId, String recordingId) {
            this.windowId = windowId;
            this.recordingId = recordingId;
        }
    }
}
