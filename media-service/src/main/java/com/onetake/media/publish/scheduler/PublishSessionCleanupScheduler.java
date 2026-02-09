package com.onetake.media.publish.scheduler;

import com.onetake.media.publish.service.PublishService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 비정상 종료된 Publish 세션 정리 스케줄러
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PublishSessionCleanupScheduler {

    private final PublishService publishService;

    /**
     * 10분마다 실행, 1시간 이상 PUBLISHING 상태인 세션 정리
     */
    @Scheduled(fixedRate = 600000) // 10분 = 600,000ms
    public void cleanupStaleSessions() {
        try {
            int cleanedCount = publishService.cleanupStaleSessions(1); // 1시간 이상
            if (cleanedCount > 0) {
                log.info("Cleaned up {} stale publish sessions", cleanedCount);
            }
        } catch (Exception e) {
            log.error("Failed to cleanup stale publish sessions", e);
        }
    }
}
