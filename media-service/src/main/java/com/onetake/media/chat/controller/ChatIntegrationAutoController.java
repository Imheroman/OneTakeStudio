package com.onetake.media.chat.controller;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.integration.ChatIntegrationService;
import com.onetake.media.chat.integration.PlatformCredentials;
import com.onetake.media.chat.integration.YouTubeBroadcastService;
import com.onetake.media.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * 채팅 연동 자동 시작 API
 *
 * Core Service에서 destination 정보를 가져와 자동으로 채팅 연동 시작
 */
@Slf4j
@RestController
@RequestMapping("/api/media/chat/integration/auto")
@RequiredArgsConstructor
public class ChatIntegrationAutoController {

    private final ChatIntegrationService chatIntegrationService;
    private final YouTubeBroadcastService youTubeBroadcastService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${core-service.url:http://localhost:8080}")
    private String coreServiceUrl;

    /**
     * destination 기반 채팅 연동 시작
     *
     * Core Service에서 destination 정보를 가져와 해당 플랫폼의 채팅 연동 시작
     */
    @PostMapping("/{studioId}/destination/{destinationId}")
    public ResponseEntity<ApiResponse<ChatIntegrationResult>> startChatByDestination(
            @PathVariable Long studioId,
            @PathVariable Long destinationId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        try {
            // Core Service에서 destination 정보 조회
            DestinationInfo destination = fetchDestinationInfo(destinationId, authHeader);
            if (destination == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("연동 채널 정보를 찾을 수 없습니다."));
            }

            // 플랫폼별 채팅 연동 시작
            ChatPlatform platform = toChatPlatform(destination.platform);
            if (platform == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("지원하지 않는 플랫폼입니다: " + destination.platform));
            }

            boolean success = startChatIntegration(studioId, platform, destination);

            if (success) {
                log.info("Chat integration started: studioId={}, platform={}, destinationId={}",
                        studioId, platform, destinationId);
                return ResponseEntity.ok(ApiResponse.success(
                        new ChatIntegrationResult(platform.name(), true, "채팅 연동 성공")
                ));
            } else {
                return ResponseEntity.ok(ApiResponse.success(
                        new ChatIntegrationResult(platform.name(), false, "채팅 연동 실패 (라이브 방송이 없거나 토큰이 만료됨)")
                ));
            }

        } catch (Exception e) {
            log.error("Chat integration failed: studioId={}, destinationId={}", studioId, destinationId, e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("채팅 연동 시작 실패: " + e.getMessage()));
        }
    }

    /**
     * 선택된 모든 destination에 대해 채팅 연동 시작
     */
    @PostMapping("/{studioId}/destinations")
    public ResponseEntity<ApiResponse<List<ChatIntegrationResult>>> startChatByDestinations(
            @PathVariable Long studioId,
            @RequestBody DestinationsRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        List<ChatIntegrationResult> results = request.destinationIds().stream()
                .map(destId -> {
                    try {
                        DestinationInfo dest = fetchDestinationInfo(destId, authHeader);
                        if (dest == null) {
                            return new ChatIntegrationResult("UNKNOWN", false, "채널 정보를 찾을 수 없음");
                        }

                        ChatPlatform platform = toChatPlatform(dest.platform);
                        if (platform == null) {
                            return new ChatIntegrationResult(dest.platform, false, "지원하지 않는 플랫폼");
                        }

                        boolean success = startChatIntegration(studioId, platform, dest);
                        return new ChatIntegrationResult(
                                platform.name(),
                                success,
                                success ? "연동 성공" : "연동 실패"
                        );
                    } catch (Exception e) {
                        log.error("Chat integration failed for destination {}: {}", destId, e.getMessage());
                        return new ChatIntegrationResult("UNKNOWN", false, e.getMessage());
                    }
                })
                .toList();

        log.info("Chat integrations started for studioId={}: {}", studioId, results);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    private DestinationInfo fetchDestinationInfo(Long destinationId, String authHeader) {
        try {
            String url = coreServiceUrl + "/api/destinations/" + destinationId + "/internal";

            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            if (authHeader != null) {
                headers.set("Authorization", authHeader);
            }

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                Object data = body.get("data");
                if (data instanceof Map) {
                    Map<String, Object> dest = (Map<String, Object>) data;
                    String platform = getStringValue(dest, "platform");
                    String channelId = getStringValue(dest, "channelId");
                    String channelName = getStringValue(dest, "channelName");
                    String accessToken = getStringValue(dest, "accessToken");
                    String refreshToken = getStringValue(dest, "refreshToken");

                    log.debug("Fetched destination: platform={}, channelId={}, hasAccessToken={}",
                            platform, channelId, accessToken != null);

                    return new DestinationInfo(platform, channelId, channelName, accessToken, refreshToken);
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch destination info for destinationId={}: {}", destinationId, e.getMessage());
        }
        return null;
    }

    private String getStringValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) return null;
        return value.toString();
    }

    private ChatPlatform toChatPlatform(String platform) {
        if (platform == null) return null;
        return switch (platform.toUpperCase()) {
            case "YOUTUBE" -> ChatPlatform.YOUTUBE;
            case "CHZZK" -> ChatPlatform.CHZZK;
            default -> null;
        };
    }

    private boolean startChatIntegration(Long studioId, ChatPlatform platform, DestinationInfo dest) {
        switch (platform) {
            case YOUTUBE -> {
                if (dest.accessToken() == null || dest.accessToken().isBlank()) {
                    log.warn("YouTube access token is null or empty for studioId={}", studioId);
                    return false;
                }
                // 자동으로 liveChatId 조회
                try {
                    String liveChatId = youTubeBroadcastService.getLiveChatId(dest.accessToken());
                    if (liveChatId == null) {
                        log.warn("No active YouTube broadcast found for studioId={}", studioId);
                        return false;
                    }
                    PlatformCredentials credentials = PlatformCredentials.forYouTube(
                            studioId, dest.accessToken(), dest.refreshToken(), liveChatId);
                    chatIntegrationService.startIntegration(studioId, credentials);
                    return true;
                } catch (Exception e) {
                    log.error("Failed to start YouTube chat integration for studioId={}: {}", studioId, e.getMessage());
                    return false;
                }
            }
            case CHZZK -> {
                if (dest.channelId() == null || dest.channelId().isBlank()) {
                    log.warn("Chzzk channel ID is null or empty for studioId={}", studioId);
                    return false;
                }
                try {
                    PlatformCredentials credentials = PlatformCredentials.forChzzk(studioId, dest.channelId());
                    chatIntegrationService.startIntegration(studioId, credentials);
                    return true;
                } catch (Exception e) {
                    log.error("Failed to start Chzzk chat integration for studioId={}: {}", studioId, e.getMessage());
                    return false;
                }
            }
            default -> {
                log.warn("Unsupported platform: {} for studioId={}", platform, studioId);
                return false;
            }
        }
    }

    // DTOs
    private record DestinationInfo(
            String platform,
            String channelId,
            String channelName,
            String accessToken,
            String refreshToken
    ) {}

    public record DestinationsRequest(List<Long> destinationIds) {}

    public record ChatIntegrationResult(String platform, boolean success, String message) {}
}
