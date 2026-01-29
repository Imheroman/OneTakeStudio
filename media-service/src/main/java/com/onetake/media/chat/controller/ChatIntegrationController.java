package com.onetake.media.chat.controller;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.integration.ChatIntegrationService;
import com.onetake.media.chat.integration.PlatformCredentials;
import com.onetake.media.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 외부 플랫폼 채팅 연동 API
 *
 * 송출 시작 시 해당 플랫폼의 채팅 연동을 시작하고,
 * 송출 종료 시 연동을 종료하는 용도
 */
@RestController
@RequestMapping("/api/media/chat/integration")
@RequiredArgsConstructor
public class ChatIntegrationController {

    private final ChatIntegrationService chatIntegrationService;

    /**
     * YouTube 채팅 연동 시작
     */
    @PostMapping("/{studioId}/youtube/start")
    public ResponseEntity<ApiResponse<Void>> startYouTubeIntegration(
            @PathVariable Long studioId,
            @RequestBody YouTubeIntegrationRequest request) {

        PlatformCredentials credentials = PlatformCredentials.forYouTube(
                studioId,
                request.accessToken(),
                request.refreshToken(),
                request.liveChatId()
        );

        chatIntegrationService.startIntegration(studioId, credentials);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * Twitch 채팅 연동 시작
     */
    @PostMapping("/{studioId}/twitch/start")
    public ResponseEntity<ApiResponse<Void>> startTwitchIntegration(
            @PathVariable Long studioId,
            @RequestBody TwitchIntegrationRequest request) {

        PlatformCredentials credentials = PlatformCredentials.forTwitch(
                studioId,
                request.accessToken(),
                request.channelName(),
                request.channelId()
        );

        chatIntegrationService.startIntegration(studioId, credentials);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * 치지직 채팅 연동 시작
     */
    @PostMapping("/{studioId}/chzzk/start")
    public ResponseEntity<ApiResponse<Void>> startChzzkIntegration(
            @PathVariable Long studioId,
            @RequestBody ChzzkIntegrationRequest request) {

        PlatformCredentials credentials = PlatformCredentials.forChzzk(
                studioId,
                request.channelId()
        );

        chatIntegrationService.startIntegration(studioId, credentials);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * 특정 플랫폼 채팅 연동 종료
     */
    @PostMapping("/{studioId}/{platform}/stop")
    public ResponseEntity<ApiResponse<Void>> stopIntegration(
            @PathVariable Long studioId,
            @PathVariable ChatPlatform platform) {

        chatIntegrationService.stopIntegration(studioId, platform);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * 스튜디오의 모든 채팅 연동 종료
     */
    @PostMapping("/{studioId}/stop-all")
    public ResponseEntity<ApiResponse<Void>> stopAllIntegrations(
            @PathVariable Long studioId) {

        chatIntegrationService.stopAllIntegrations(studioId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * 연동 상태 조회
     */
    @GetMapping("/{studioId}/status")
    public ResponseEntity<ApiResponse<IntegrationStatusResponse>> getIntegrationStatus(
            @PathVariable Long studioId) {

        List<ChatPlatform> activePlatforms = chatIntegrationService.getActiveIntegrations(studioId);

        IntegrationStatusResponse response = new IntegrationStatusResponse(
                studioId,
                activePlatforms,
                Map.of(
                        ChatPlatform.YOUTUBE, chatIntegrationService.isIntegrationActive(studioId, ChatPlatform.YOUTUBE),
                        ChatPlatform.TWITCH, chatIntegrationService.isIntegrationActive(studioId, ChatPlatform.TWITCH),
                        ChatPlatform.CHZZK, chatIntegrationService.isIntegrationActive(studioId, ChatPlatform.CHZZK)
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

    public record TwitchIntegrationRequest(
            String accessToken,
            String channelName,
            String channelId
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
