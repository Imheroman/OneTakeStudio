package com.onetake.media.chat.controller;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.integration.ChatIntegrationService;
import com.onetake.media.chat.integration.PlatformCredentials;
import com.onetake.media.chat.integration.YouTubeBroadcastService;
import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.global.resolver.StudioIdResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 외부 플랫폼 채팅 연동 API
 *
 * 송출 시작 시 해당 플랫폼의 채팅 연동을 시작하고,
 * 송출 종료 시 연동을 종료하는 용도
 *
 * OAuth 인증 완료 후 DB에 저장된 토큰을 사용하여 연동
 */
@Slf4j
@RestController
@RequestMapping("/api/media/chat/integration")
@RequiredArgsConstructor
public class ChatIntegrationController {

    private final ChatIntegrationService chatIntegrationService;
    private final YouTubeBroadcastService youTubeBroadcastService;
    private final StudioIdResolver studioIdResolver;

    /**
     * YouTube 채팅 연동 시작 (DB 토큰 사용)
     * userId로 DB에서 토큰 조회하여 연동
     */
    @PostMapping("/{studioId}/youtube/start")
    public ResponseEntity<ApiResponse<Void>> startYouTubeIntegration(
            @PathVariable String studioId,
            @RequestParam Long userId) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);

        if (!chatIntegrationService.hasValidToken(userId, ChatPlatform.YOUTUBE)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("YouTube OAuth 인증이 필요합니다. /api/oauth/youtube/authorize 를 먼저 호출하세요."));
        }

        chatIntegrationService.startIntegrationWithStoredToken(userId, resolvedStudioId, ChatPlatform.YOUTUBE);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * 치지직 채팅 연동 시작 (DB 토큰 사용)
     * userId로 DB에서 토큰 조회하여 연동
     */
    @PostMapping("/{studioId}/chzzk/start")
    public ResponseEntity<ApiResponse<Void>> startChzzkIntegration(
            @PathVariable String studioId,
            @RequestParam Long userId) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);

        if (!chatIntegrationService.hasValidToken(userId, ChatPlatform.CHZZK)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("치지직 OAuth 인증이 필요합니다. /api/oauth/chzzk/authorize 를 먼저 호출하세요."));
        }

        chatIntegrationService.startIntegrationWithStoredToken(userId, resolvedStudioId, ChatPlatform.CHZZK);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * YouTube 채팅 연동 시작 (레거시 - 토큰 직접 전달)
     * @deprecated OAuth 인증 방식 사용 권장
     */
    @Deprecated
    @PostMapping("/{studioId}/youtube/start-legacy")
    public ResponseEntity<ApiResponse<Void>> startYouTubeIntegrationLegacy(
            @PathVariable String studioId,
            @RequestBody YouTubeIntegrationRequest request) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);

        PlatformCredentials credentials = PlatformCredentials.forYouTube(
                resolvedStudioId,
                request.accessToken(),
                request.refreshToken(),
                request.liveChatId()
        );

        chatIntegrationService.startIntegration(resolvedStudioId, credentials);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * YouTube 채팅 연동 시작 (자동으로 liveChatId 조회 - 레거시)
     * @deprecated OAuth 인증 방식 사용 권장
     */
    @Deprecated
    @PostMapping("/{studioId}/youtube/auto-start")
    public ResponseEntity<ApiResponse<YouTubeAutoStartResponse>> startYouTubeIntegrationAuto(
            @PathVariable String studioId,
            @RequestBody YouTubeAutoStartRequest request) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);

        String liveChatId = youTubeBroadcastService.getLiveChatId(request.accessToken());

        if (liveChatId == null) {
            log.warn("No active YouTube broadcast found for studioId={}", resolvedStudioId);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("활성 또는 예정된 YouTube 라이브 방송이 없습니다."));
        }

        PlatformCredentials credentials = PlatformCredentials.forYouTube(
                resolvedStudioId,
                request.accessToken(),
                request.refreshToken(),
                liveChatId
        );

        chatIntegrationService.startIntegration(resolvedStudioId, credentials);
        log.info("YouTube Chat auto-connected: studioId={}, liveChatId={}", resolvedStudioId, liveChatId);

        return ResponseEntity.ok(ApiResponse.success(
                new YouTubeAutoStartResponse(liveChatId, "YouTube 채팅 연동 성공")
        ));
    }

    /**
     * 치지직 채팅 연동 시작 (레거시 - 채널 ID 직접 전달)
     * @deprecated OAuth 인증 방식 사용 권장
     */
    @Deprecated
    @PostMapping("/{studioId}/chzzk/start-legacy")
    public ResponseEntity<ApiResponse<Void>> startChzzkIntegrationLegacy(
            @PathVariable String studioId,
            @RequestBody ChzzkIntegrationRequest request) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);

        PlatformCredentials credentials = PlatformCredentials.forChzzk(
                resolvedStudioId,
                request.channelId()
        );

        chatIntegrationService.startIntegration(resolvedStudioId, credentials);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * 특정 플랫폼 채팅 연동 종료
     */
    @PostMapping("/{studioId}/{platform}/stop")
    public ResponseEntity<ApiResponse<Void>> stopIntegration(
            @PathVariable String studioId,
            @PathVariable ChatPlatform platform) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        chatIntegrationService.stopIntegration(resolvedStudioId, platform);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * 스튜디오의 모든 채팅 연동 종료
     */
    @PostMapping("/{studioId}/stop-all")
    public ResponseEntity<ApiResponse<Void>> stopAllIntegrations(
            @PathVariable String studioId) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        chatIntegrationService.stopAllIntegrations(resolvedStudioId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * 연동 상태 조회
     */
    @GetMapping("/{studioId}/status")
    public ResponseEntity<ApiResponse<IntegrationStatusResponse>> getIntegrationStatus(
            @PathVariable String studioId) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        List<ChatPlatform> activePlatforms = chatIntegrationService.getActiveIntegrations(resolvedStudioId);

        IntegrationStatusResponse response = new IntegrationStatusResponse(
                resolvedStudioId,
                activePlatforms,
                Map.of(
                        ChatPlatform.YOUTUBE, chatIntegrationService.isIntegrationActive(resolvedStudioId, ChatPlatform.YOUTUBE),
                        ChatPlatform.CHZZK, chatIntegrationService.isIntegrationActive(resolvedStudioId, ChatPlatform.CHZZK)
                )
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // Request DTOs
    public record YouTubeIntegrationRequest(
            String accessToken,
            String refreshToken,
            String liveChatId
    ) {}

    public record YouTubeAutoStartRequest(
            String accessToken,
            String refreshToken
    ) {}

    // Response DTOs
    public record YouTubeAutoStartResponse(
            String liveChatId,
            String message
    ) {}

    public record ChzzkIntegrationRequest(
            String channelId
    ) {}

    // Response DTO
    public record IntegrationStatusResponse(
            Long studioId,
            List<ChatPlatform> activePlatforms,
            Map<ChatPlatform, Boolean> platformStatus
    ) {}
}
