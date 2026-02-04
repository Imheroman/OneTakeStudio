package com.onetake.media.chat.controller;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.PlatformToken;
import com.onetake.media.chat.integration.ChatIntegrationService;
import com.onetake.media.chat.integration.PlatformCredentials;
import com.onetake.media.chat.integration.YouTubeBroadcastService;
import com.onetake.media.chat.service.OAuthService;
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
    private final OAuthService oAuthService;
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
            @PathVariable String studioId,
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

            String failReason = startChatIntegration(studioId, platform, destination);
            boolean success = failReason == null;

            if (success) {
                log.info("Chat integration started: studioId={}, platform={}, destinationId={}",
                        studioId, platform, destinationId);
                return ResponseEntity.ok(ApiResponse.success(
                        new ChatIntegrationResult(platform.name(), true, "채팅 연동 성공")
                ));
            } else {
                return ResponseEntity.ok(ApiResponse.success(
                        new ChatIntegrationResult(platform.name(), false, failReason)
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
            @PathVariable String studioId,
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

                        String failReason = startChatIntegration(studioId, platform, dest);
                        boolean success = failReason == null;
                        return new ChatIntegrationResult(
                                platform.name(),
                                success,
                                success ? "연동 성공" : failReason
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
                    Long userId = getLongValue(dest, "userId");
                    String platform = getStringValue(dest, "platform");
                    String channelId = getStringValue(dest, "channelId");
                    String channelName = getStringValue(dest, "channelName");
                    String accessToken = getStringValue(dest, "accessToken");
                    String refreshToken = getStringValue(dest, "refreshToken");

                    log.debug("Fetched destination: platform={}, channelId={}, userId={}, hasAccessToken={}",
                            platform, channelId, userId, accessToken != null);

                    return new DestinationInfo(userId, platform, channelId, channelName, accessToken, refreshToken);
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

    private Long getLongValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).longValue();
        try { return Long.parseLong(value.toString()); } catch (NumberFormatException e) { return null; }
    }

    private ChatPlatform toChatPlatform(String platform) {
        if (platform == null) return null;
        return switch (platform.toUpperCase()) {
            case "YOUTUBE" -> ChatPlatform.YOUTUBE;
            case "CHZZK" -> ChatPlatform.CHZZK;
            default -> null;
        };
    }

    /**
     * 채팅 연동 시작. 성공 시 null 반환, 실패 시 사유 문자열 반환.
     */
    private String startChatIntegration(String studioId, ChatPlatform platform, DestinationInfo dest) {
        switch (platform) {
            case YOUTUBE -> {
                String accessToken = dest.accessToken();
                String refreshToken = dest.refreshToken();

                // Core Service destination에 토큰이 없으면 Media Service PlatformToken에서 fallback 조회
                if (accessToken == null || accessToken.isBlank()) {
                    log.info("YouTube accessToken not in destination, trying PlatformToken fallback for userId={}", dest.userId());
                    if (dest.userId() != null) {
                        try {
                            PlatformToken platformToken = oAuthService.getValidToken(dest.userId(), ChatPlatform.YOUTUBE);
                            accessToken = platformToken.getAccessToken();
                            refreshToken = platformToken.getRefreshToken();
                            log.info("YouTube token found via PlatformToken fallback for userId={}", dest.userId());
                        } catch (Exception e) {
                            log.warn("PlatformToken fallback failed for userId={}: {}", dest.userId(), e.getMessage());
                        }
                    }
                }

                if (accessToken == null || accessToken.isBlank()) {
                    log.warn("YouTube access token is null or empty for studioId={}", studioId);
                    return "YouTube accessToken이 없습니다. 채널을 다시 연동해주세요.";
                }
                // 자동으로 liveChatId 조회 (최대 5회 재시도, 5초 간격 — YouTube 방송 활성화 대기)
                String liveChatId = null;
                for (int attempt = 1; attempt <= 5; attempt++) {
                    liveChatId = youTubeBroadcastService.getLiveChatId(accessToken);
                    if (liveChatId != null) break;
                    if (attempt < 5) {
                        log.info("YouTube liveChatId not found, retry {}/5 for studioId={}", attempt, studioId);
                        try { Thread.sleep(5000); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
                    }
                }
                if (liveChatId == null) {
                    log.warn("No active YouTube broadcast found after retries for studioId={}", studioId);
                    return "YouTube에 활성/예정 방송이 없습니다. 송출이 시작된 후 잠시 기다려주세요.";
                }
                try {
                    PlatformCredentials credentials = PlatformCredentials.forYouTube(
                            studioId, accessToken, refreshToken, liveChatId);
                    chatIntegrationService.startIntegration(studioId, credentials);
                    return null; // 성공
                } catch (Exception e) {
                    log.error("Failed to start YouTube chat integration for studioId={}: {}", studioId, e.getMessage());
                    return "YouTube 채팅 연동 예외: " + e.getMessage();
                }
            }
            case CHZZK -> {
                if (dest.channelId() == null || dest.channelId().isBlank()) {
                    log.warn("Chzzk channel ID is null or empty for studioId={}", studioId);
                    return "Chzzk channelId가 없습니다.";
                }
                try {
                    PlatformCredentials credentials = PlatformCredentials.forChzzk(studioId, dest.channelId());
                    chatIntegrationService.startIntegration(studioId, credentials);
                    return null; // 성공
                } catch (Exception e) {
                    log.error("Failed to start Chzzk chat integration for studioId={}: {}", studioId, e.getMessage());
                    return "Chzzk 채팅 연동 예외: " + e.getMessage();
                }
            }
            default -> {
                log.warn("Unsupported platform: {} for studioId={}", platform, studioId);
                return "지원하지 않는 플랫폼: " + platform;
            }
        }
    }

    // DTOs
    private record DestinationInfo(
            Long userId,
            String platform,
            String channelId,
            String channelName,
            String accessToken,
            String refreshToken
    ) {}

    public record DestinationsRequest(List<Long> destinationIds) {}

    public record ChatIntegrationResult(String platform, boolean success, String message) {}
}
