package com.onetake.media.viewer.service;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.integration.PlatformCredentials;
import com.onetake.media.publish.entity.PublishSession;
import com.onetake.media.publish.entity.PublishStatus;
import com.onetake.media.publish.repository.PublishSessionRepository;
import com.onetake.media.viewer.integration.ChzzkViewerClient;
import com.onetake.media.viewer.integration.ExternalViewerClient;
import com.onetake.media.viewer.integration.YouTubeViewerClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 시청자 지표 통합 서비스
 *
 * 외부 플랫폼에서 시청자 수를 가져와서 저장하고 브로드캐스트
 *
 * 사용 흐름:
 * 1. startMetricsCollection(studioId, credentials) - 특정 플랫폼 시청자 수집 시작
 * 2. 스케줄러가 10초마다 collectAndBroadcast() 호출
 * 3. 외부 시청자 수 → ViewerMetricsService → DB 저장 + WebSocket 브로드캐스트
 * 4. stopMetricsCollection(studioId, platform) - 수집 종료
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ViewerMetricsIntegrationService {

    private final ViewerMetricsService viewerMetricsService;
    private final PublishSessionRepository publishSessionRepository;
    private final YouTubeViewerClient youTubeViewerClient;
    private final ChzzkViewerClient chzzkViewerClient;

    // 스튜디오별 활성 시청자 수집 상태: studioId -> (platform -> client)
    private final Map<String, Map<ChatPlatform, ExternalViewerClient>> activeCollections = new ConcurrentHashMap<>();

    /**
     * 플랫폼 시청자 수집 시작
     */
    public void startMetricsCollection(String studioId, PlatformCredentials credentials) {
        ExternalViewerClient client = getClientForPlatform(credentials.getPlatform());
        if (client == null) {
            log.warn("Unsupported platform for viewer metrics: {}", credentials.getPlatform());
            return;
        }

        // 기존 수집이 있으면 먼저 종료
        stopMetricsCollection(studioId, credentials.getPlatform());

        // 새 수집 시작
        client.connect(credentials);

        // 활성 수집 목록에 추가
        activeCollections
                .computeIfAbsent(studioId, k -> new ConcurrentHashMap<>())
                .put(credentials.getPlatform(), client);

        log.info("Viewer metrics collection started: studioId={}, platform={}",
                studioId, credentials.getPlatform());
    }

    /**
     * 플랫폼 시청자 수집 종료
     */
    public void stopMetricsCollection(String studioId, ChatPlatform platform) {
        Map<ChatPlatform, ExternalViewerClient> studioCollections = activeCollections.get(studioId);
        if (studioCollections == null) {
            return;
        }

        ExternalViewerClient client = studioCollections.remove(platform);
        if (client != null && client.isConnected()) {
            client.disconnect();
            log.info("Viewer metrics collection stopped: studioId={}, platform={}", studioId, platform);
        }

        // 스튜디오의 모든 수집이 종료되면 맵에서 제거
        if (studioCollections.isEmpty()) {
            activeCollections.remove(studioId);
        }
    }

    /**
     * 스튜디오의 모든 플랫폼 시청자 수집 종료
     */
    public void stopAllMetricsCollections(String studioId) {
        Map<ChatPlatform, ExternalViewerClient> studioCollections = activeCollections.remove(studioId);
        if (studioCollections != null) {
            studioCollections.values().forEach(client -> {
                if (client.isConnected()) {
                    client.disconnect();
                }
            });
            log.info("All viewer metrics collections stopped: studioId={}", studioId);
        }
    }

    /**
     * 수집 상태 확인
     */
    public boolean isCollectionActive(String studioId, ChatPlatform platform) {
        Map<ChatPlatform, ExternalViewerClient> studioCollections = activeCollections.get(studioId);
        if (studioCollections == null) {
            return false;
        }
        ExternalViewerClient client = studioCollections.get(platform);
        return client != null && client.isConnected();
    }

    /**
     * 활성 수집 목록 조회
     */
    public List<ChatPlatform> getActiveCollections(String studioId) {
        Map<ChatPlatform, ExternalViewerClient> studioCollections = activeCollections.get(studioId);
        if (studioCollections == null) {
            return List.of();
        }
        return studioCollections.entrySet().stream()
                .filter(e -> e.getValue().isConnected())
                .map(Map.Entry::getKey)
                .toList();
    }

    /**
     * 주기적으로 시청자 수 수집 및 브로드캐스트 (10초마다)
     */
    @Scheduled(fixedDelay = 10000)
    public void collectAndBroadcast() {
        // 명시적으로 등록된 수집 처리
        for (Map.Entry<String, Map<ChatPlatform, ExternalViewerClient>> studioEntry : activeCollections.entrySet()) {
            String studioId = studioEntry.getKey();
            collectMetricsForStudio(studioId, studioEntry.getValue());
        }

        // 활성 송출 세션에 대해서도 자동 수집 (연동이 없어도)
        collectForActivePublishSessions();
    }

    /**
     * 활성 송출 세션의 시청자 수 자동 수집
     */
    private void collectForActivePublishSessions() {
        // PUBLISHING 상태인 세션 조회
        List<PublishSession> activeSessions = publishSessionRepository
                .findAll().stream()
                .filter(s -> s.getStatus() == PublishStatus.PUBLISHING)
                .toList();

        for (PublishSession session : activeSessions) {
            String studioId = session.getStudioId();

            // 이미 활성 수집이 있으면 스킵
            if (activeCollections.containsKey(studioId)) {
                continue;
            }

            // 기본 mock 데이터 수집 (실제 구현 시 destination 정보로 플랫폼 결정)
            log.debug("Auto-collecting viewer metrics for publishing session: studioId={}", studioId);
        }
    }

    /**
     * 특정 스튜디오의 모든 활성 클라이언트에서 시청자 수 수집
     */
    private void collectMetricsForStudio(String studioId, Map<ChatPlatform, ExternalViewerClient> clients) {
        for (ExternalViewerClient client : clients.values()) {
            if (!client.isConnected()) {
                continue;
            }

            try {
                Optional<Long> viewerCount = client.fetchViewerCount();
                viewerCount.ifPresent(count ->
                        viewerMetricsService.saveAndBroadcast(studioId, client.getPlatform(), count)
                );

                if (viewerCount.isPresent()) {
                    log.debug("Collected viewer count from {}: studioId={}, viewers={}",
                            client.getPlatform(), studioId, viewerCount.get());
                }
            } catch (Exception e) {
                log.error("Failed to collect viewer count from {}: studioId={}",
                        client.getPlatform(), studioId, e);
            }
        }
    }

    private ExternalViewerClient getClientForPlatform(ChatPlatform platform) {
        return switch (platform) {
            case YOUTUBE -> youTubeViewerClient;
            case CHZZK -> chzzkViewerClient;
            default -> null;
        };
    }
}
