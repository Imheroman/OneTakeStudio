package com.onetake.media.chat.integration;

import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.PlatformToken;
import com.onetake.media.chat.service.ChatService;
import com.onetake.media.chat.service.OAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
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
    private final OAuthService oAuthService;
    private final YouTubeChatClientFactory youTubeChatClientFactory;
    private final ChzzkChatClientFactory chzzkChatClientFactory;

    // 스튜디오별 활성 연동 상태: studioId -> (platform -> client)
    private final Map<String, Map<ChatPlatform, ExternalChatClient>> activeIntegrations = new ConcurrentHashMap<>();

    /**
     * 플랫폼 채팅 연동 시작 (기존 방식 - credentials 직접 전달)
     */
    public void startIntegration(String studioId, PlatformCredentials credentials) {
        // 기존 연동이 있으면 먼저 종료
        stopIntegration(studioId, credentials.getPlatform());

        // 새 클라이언트 인스턴스 생성 (스튜디오별 독립)
        ExternalChatClient client = createClientForPlatform(credentials.getPlatform());
        if (client == null) {
            log.warn("Unsupported platform: {}", credentials.getPlatform());
            return;
        }

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
     * 플랫폼 채팅 연동 시작 (DB 토큰 사용)
     */
    public void startIntegrationWithStoredToken(Long userId, String studioId, ChatPlatform platform) {
        // DB에서 유효한 토큰 조회 (만료 임박 시 자동 갱신)
        PlatformToken token = oAuthService.getValidToken(userId, platform);

        PlatformCredentials credentials = buildCredentialsFromToken(token, studioId);
        startIntegration(studioId, credentials);
    }

    /**
     * PlatformToken → PlatformCredentials 변환
     */
    private PlatformCredentials buildCredentialsFromToken(PlatformToken token, String studioId) {
        return switch (token.getPlatform()) {
            case YOUTUBE -> PlatformCredentials.builder()
                    .platform(ChatPlatform.YOUTUBE)
                    .studioId(studioId)
                    .accessToken(token.getAccessToken())
                    .refreshToken(token.getRefreshToken())
                    .liveChatId(token.getLiveChatId())
                    .broadcastId(token.getBroadcastId())
                    .build();
            case CHZZK -> PlatformCredentials.builder()
                    .platform(ChatPlatform.CHZZK)
                    .studioId(studioId)
                    .chzzkChannelId(token.getChannelId())
                    .build();
            default -> throw new IllegalArgumentException("Unsupported platform: " + token.getPlatform());
        };
    }

    /**
     * 토큰 연동 여부 확인
     */
    public boolean hasValidToken(Long userId, ChatPlatform platform) {
        Optional<PlatformToken> token = oAuthService.getToken(userId, platform);
        return token.isPresent() && !token.get().isExpired();
    }

    /**
     * 플랫폼 채팅 연동 종료
     */
    public void stopIntegration(String studioId, ChatPlatform platform) {
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
    public void stopAllIntegrations(String studioId) {
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
    public boolean isIntegrationActive(String studioId, ChatPlatform platform) {
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
    public List<ChatPlatform> getActiveIntegrations(String studioId) {
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
        for (Map.Entry<String, Map<ChatPlatform, ExternalChatClient>> studioEntry : activeIntegrations.entrySet()) {
            String studioId = studioEntry.getKey();

            for (ExternalChatClient client : studioEntry.getValue().values()) {
                if (!client.isConnected()) {
                    continue;
                }

                try {
                    List<ChatMessageRequest> messages = client.fetchNewMessages();
                    for (ChatMessageRequest message : messages) {
                        log.info("[ChatPoll] Broadcasting message: studioId={}, platform={}, sender={}, content={}",
                                studioId, client.getPlatform(), message.getSenderName(),
                                message.getContent() != null ? message.getContent().substring(0, Math.min(50, message.getContent().length())) : "null");
                        chatService.receiveExternalMessage(studioId, message);
                    }

                    if (!messages.isEmpty()) {
                        log.info("[ChatPoll] Fetched {} messages from {}: studioId={}",
                                messages.size(), client.getPlatform(), studioId);
                    }
                } catch (Exception e) {
                    log.error("[ChatPoll] Failed to fetch messages from {}: studioId={}",
                            client.getPlatform(), studioId, e);
                }
            }
        }
    }

    /**
     * 플랫폼별 새 클라이언트 인스턴스 생성
     * 팩토리를 통해 매번 새 인스턴스 생성 (스튜디오별 독립 상태)
     */
    private ExternalChatClient createClientForPlatform(ChatPlatform platform) {
        return switch (platform) {
            case YOUTUBE -> youTubeChatClientFactory.create();
            case CHZZK -> chzzkChatClientFactory.create();
            default -> null;
        };
    }
}
