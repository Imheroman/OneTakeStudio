package com.onetake.media.chat.integration;

import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 통합 채팅 서비스
 *
 * 외부 플랫폼에서 채팅을 가져와서 내부 시스템에 저장하고 브로드캐스트
 *
 * 사용 흐름:
 * 1. startIntegration(studioId, credentials) - 특정 플랫폼 채팅 연동 시작
 * 2. 스케줄러가 주기적으로 fetchAndBroadcast() 호출
 * 3. 외부 채팅 → ChatService.receiveExternalMessage() → DB 저장 + WebSocket 브로드캐스트
 * 4. stopIntegration(studioId, platform) - 연동 종료
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatIntegrationService {

    private final ChatService chatService;
    private final YouTubeChatClient youTubeChatClient;
    private final TwitchChatClient twitchChatClient;
    private final ChzzkChatClient chzzkChatClient;

    // 스튜디오별 활성 연동 상태: studioId -> (platform -> client)
    private final Map<Long, Map<ChatPlatform, ExternalChatClient>> activeIntegrations = new ConcurrentHashMap<>();

    /**
     * 플랫폼 채팅 연동 시작
     */
    public void startIntegration(Long studioId, PlatformCredentials credentials) {
        ExternalChatClient client = getClientForPlatform(credentials.getPlatform());
        if (client == null) {
            log.warn("Unsupported platform: {}", credentials.getPlatform());
            return;
        }

        // 기존 연동이 있으면 먼저 종료
        stopIntegration(studioId, credentials.getPlatform());

        // 새 연동 시작
        client.connect(credentials);

        // 활성 연동 목록에 추가
        activeIntegrations
                .computeIfAbsent(studioId, k -> new ConcurrentHashMap<>())
                .put(credentials.getPlatform(), client);

        log.info("Chat integration started: studioId={}, platform={}",
                studioId, credentials.getPlatform());
    }

    /**
     * 플랫폼 채팅 연동 종료
     */
    public void stopIntegration(Long studioId, ChatPlatform platform) {
        Map<ChatPlatform, ExternalChatClient> studioIntegrations = activeIntegrations.get(studioId);
        if (studioIntegrations == null) {
            return;
        }

        ExternalChatClient client = studioIntegrations.remove(platform);
        if (client != null && client.isConnected()) {
            client.disconnect();
            log.info("Chat integration stopped: studioId={}, platform={}", studioId, platform);
        }

        // 스튜디오의 모든 연동이 종료되면 맵에서 제거
        if (studioIntegrations.isEmpty()) {
            activeIntegrations.remove(studioId);
        }
    }

    /**
     * 스튜디오의 모든 플랫폼 채팅 연동 종료
     */
    public void stopAllIntegrations(Long studioId) {
        Map<ChatPlatform, ExternalChatClient> studioIntegrations = activeIntegrations.remove(studioId);
        if (studioIntegrations != null) {
            studioIntegrations.values().forEach(client -> {
                if (client.isConnected()) {
                    client.disconnect();
                }
            });
            log.info("All chat integrations stopped: studioId={}", studioId);
        }
    }

    /**
     * 연동 상태 확인
     */
    public boolean isIntegrationActive(Long studioId, ChatPlatform platform) {
        Map<ChatPlatform, ExternalChatClient> studioIntegrations = activeIntegrations.get(studioId);
        if (studioIntegrations == null) {
            return false;
        }
        ExternalChatClient client = studioIntegrations.get(platform);
        return client != null && client.isConnected();
    }

    /**
     * 활성 연동 목록 조회
     */
    public List<ChatPlatform> getActiveIntegrations(Long studioId) {
        Map<ChatPlatform, ExternalChatClient> studioIntegrations = activeIntegrations.get(studioId);
        if (studioIntegrations == null) {
            return List.of();
        }
        return studioIntegrations.entrySet().stream()
                .filter(e -> e.getValue().isConnected())
                .map(Map.Entry::getKey)
                .toList();
    }

    /**
     * 주기적으로 외부 채팅 가져와서 브로드캐스트 (5초마다)
     */
    @Scheduled(fixedDelay = 5000)
    public void fetchAndBroadcast() {
        for (Map.Entry<Long, Map<ChatPlatform, ExternalChatClient>> studioEntry : activeIntegrations.entrySet()) {
            Long studioId = studioEntry.getKey();

            for (ExternalChatClient client : studioEntry.getValue().values()) {
                if (!client.isConnected()) {
                    continue;
                }

                try {
                    List<ChatMessageRequest> messages = client.fetchNewMessages();
                    for (ChatMessageRequest message : messages) {
                        chatService.receiveExternalMessage(message);
                    }

                    if (!messages.isEmpty()) {
                        log.debug("Fetched {} messages from {}: studioId={}",
                                messages.size(), client.getPlatform(), studioId);
                    }
                } catch (Exception e) {
                    log.error("Failed to fetch messages from {}: studioId={}",
                            client.getPlatform(), studioId, e);
                }
            }
        }
    }

    private ExternalChatClient getClientForPlatform(ChatPlatform platform) {
        return switch (platform) {
            case YOUTUBE -> youTubeChatClient;
            case TWITCH -> twitchChatClient;
            case CHZZK -> chzzkChatClient;
            default -> null;
        };
    }
}
