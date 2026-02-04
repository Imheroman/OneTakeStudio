package com.onetake.media.chat.controller;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.PlatformToken;
import com.onetake.media.chat.service.OAuthService;
import com.onetake.media.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthService oAuthService;

    /**
     * OAuth 로그인 URL 반환
     * GET /api/oauth/{platform}/authorize?userId={userId}&studioId={studioId}
     */
    @GetMapping("/{platform}/authorize")
    public ResponseEntity<ApiResponse<AuthorizeResponse>> getAuthorizationUrl(
            @PathVariable String platform,
            @RequestParam Long userId,
            @RequestParam(required = false) String studioId) {

        ChatPlatform chatPlatform = parsePlatform(platform);
        String authUrl = oAuthService.getAuthorizationUrl(chatPlatform, userId, studioId);

        return ResponseEntity.ok(ApiResponse.success(new AuthorizeResponse(authUrl)));
    }

    /**
     * OAuth 콜백 처리 (YouTube)
     * GET /api/oauth/youtube/callback?code={code}&state={state}
     */
    @GetMapping("/youtube/callback")
    public ResponseEntity<Void> youtubeCallback(
            @RequestParam String code,
            @RequestParam String state,
            @RequestParam(required = false) String error) {

        if (error != null) {
            log.warn("[YouTube] OAuth error: {}", error);
            return redirectToFrontend("error", error);
        }

        try {
            PlatformToken token = oAuthService.exchangeCodeForToken(ChatPlatform.YOUTUBE, code, state);
            log.info("[YouTube] OAuth completed for userId: {}", token.getUserId());
            return redirectToFrontend("success", "youtube");
        } catch (Exception e) {
            log.error("[YouTube] OAuth callback failed: {}", e.getMessage());
            return redirectToFrontend("error", e.getMessage());
        }
    }

    /**
     * OAuth 콜백 처리 (치지직)
     * GET /api/oauth/chzzk/callback?code={code}&state={state}
     */
    @GetMapping("/chzzk/callback")
    public ResponseEntity<Void> chzzkCallback(
            @RequestParam String code,
            @RequestParam String state,
            @RequestParam(required = false) String error) {

        if (error != null) {
            log.warn("[Chzzk] OAuth error: {}", error);
            return redirectToFrontend("error", error);
        }

        try {
            PlatformToken token = oAuthService.exchangeCodeForToken(ChatPlatform.CHZZK, code, state);
            log.info("[Chzzk] OAuth completed for userId: {}", token.getUserId());
            return redirectToFrontend("success", "chzzk");
        } catch (Exception e) {
            log.error("[Chzzk] OAuth callback failed: {}", e.getMessage());
            return redirectToFrontend("error", e.getMessage());
        }
    }

    /**
     * 토큰 갱신
     * POST /api/oauth/{platform}/refresh?userId={userId}
     */
    @PostMapping("/{platform}/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refreshToken(
            @PathVariable String platform,
            @RequestParam Long userId) {

        ChatPlatform chatPlatform = parsePlatform(platform);

        try {
            PlatformToken token = oAuthService.refreshToken(chatPlatform, userId);
            return ResponseEntity.ok(ApiResponse.success(TokenResponse.from(token)));
        } catch (Exception e) {
            log.error("[{}] Token refresh failed for userId {}: {}", platform, userId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Token refresh failed: " + e.getMessage()));
        }
    }

    /**
     * 연동 해제
     * DELETE /api/oauth/{platform}/revoke?userId={userId}
     */
    @DeleteMapping("/{platform}/revoke")
    public ResponseEntity<ApiResponse<Void>> revokeToken(
            @PathVariable String platform,
            @RequestParam Long userId) {

        ChatPlatform chatPlatform = parsePlatform(platform);
        oAuthService.revokeToken(chatPlatform, userId);

        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * 토큰 조회
     * GET /api/oauth/{platform}/token?userId={userId}
     */
    @GetMapping("/{platform}/token")
    public ResponseEntity<ApiResponse<TokenResponse>> getToken(
            @PathVariable String platform,
            @RequestParam Long userId) {

        ChatPlatform chatPlatform = parsePlatform(platform);

        return oAuthService.getToken(userId, chatPlatform)
                .map(token -> ResponseEntity.ok(ApiResponse.success(TokenResponse.from(token))))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Token not found")));
    }

    /**
     * 사용자의 모든 연동 상태 조회
     * GET /api/oauth/status?userId={userId}
     */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<List<TokenStatusResponse>>> getTokenStatus(
            @RequestParam Long userId) {

        List<PlatformToken> tokens = oAuthService.getTokensByUserId(userId);
        List<TokenStatusResponse> statuses = tokens.stream()
                .map(TokenStatusResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(statuses));
    }

    /**
     * YouTube Live Chat ID 설정
     * PUT /api/oauth/youtube/live-chat?userId={userId}
     */
    @PutMapping("/youtube/live-chat")
    public ResponseEntity<ApiResponse<TokenResponse>> updateLiveChatId(
            @RequestParam Long userId,
            @RequestBody LiveChatRequest request) {

        PlatformToken token = oAuthService.updateLiveChatId(
                userId, ChatPlatform.YOUTUBE, request.liveChatId(), request.broadcastId());

        return ResponseEntity.ok(ApiResponse.success(TokenResponse.from(token)));
    }

    /**
     * 치지직 Channel ID 설정
     * PUT /api/oauth/chzzk/channel?userId={userId}
     */
    @PutMapping("/chzzk/channel")
    public ResponseEntity<ApiResponse<TokenResponse>> updateChannelId(
            @RequestParam Long userId,
            @RequestBody ChannelRequest request) {

        PlatformToken token = oAuthService.updateChannelId(
                userId, ChatPlatform.CHZZK, request.channelId());

        return ResponseEntity.ok(ApiResponse.success(TokenResponse.from(token)));
    }

    private ChatPlatform parsePlatform(String platform) {
        return switch (platform.toLowerCase()) {
            case "youtube" -> ChatPlatform.YOUTUBE;
            case "chzzk" -> ChatPlatform.CHZZK;
            default -> throw new IllegalArgumentException("Unsupported platform: " + platform);
        };
    }

    private ResponseEntity<Void> redirectToFrontend(String status, String message) {
        String frontendUri = oAuthService.getFrontendRedirectUri();
        String safeMessage = (message != null) ? message : "unknown_error";
        String encodedMessage = java.net.URLEncoder.encode(safeMessage, java.nio.charset.StandardCharsets.UTF_8);
        String redirectUrl = frontendUri + "?status=" + status + "&message=" + encodedMessage;
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(redirectUrl))
                .build();
    }

    // Response DTOs
    public record AuthorizeResponse(String authUrl) {}

    public record TokenResponse(
            Long userId,
            ChatPlatform platform,
            String liveChatId,
            String broadcastId,
            String channelId,
            boolean expired,
            boolean expiringSoon
    ) {
        public static TokenResponse from(PlatformToken token) {
            return new TokenResponse(
                    token.getUserId(),
                    token.getPlatform(),
                    token.getLiveChatId(),
                    token.getBroadcastId(),
                    token.getChannelId(),
                    token.isExpired(),
                    token.isExpiringSoon()
            );
        }
    }

    public record TokenStatusResponse(
            ChatPlatform platform,
            boolean connected,
            boolean expired,
            String liveChatId,
            String channelId
    ) {
        public static TokenStatusResponse from(PlatformToken token) {
            return new TokenStatusResponse(
                    token.getPlatform(),
                    token.getAccessToken() != null,
                    token.isExpired(),
                    token.getLiveChatId(),
                    token.getChannelId()
            );
        }
    }

    // Request DTOs
    public record LiveChatRequest(String liveChatId, String broadcastId) {}
    public record ChannelRequest(String channelId) {}
}
