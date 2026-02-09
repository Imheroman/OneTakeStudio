package com.onetake.media.chat.integration;

import com.onetake.media.chat.entity.ChatPlatform;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 외부 플랫폼 인증 정보
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformCredentials {

    private ChatPlatform platform;

    private String studioId;

    // OAuth Access Token (YouTube)
    private String accessToken;

    // Refresh Token (토큰 갱신용)
    private String refreshToken;

    // YouTube Live Chat ID
    private String liveChatId;

    // YouTube Live Broadcast ID
    private String broadcastId;

    // 치지직 채널 ID
    private String chzzkChannelId;

    // API Key (필요한 경우)
    private String apiKey;

    /**
     * YouTube 인증 정보 생성
     */
    public static PlatformCredentials forYouTube(String studioId, String accessToken,
                                                  String refreshToken, String liveChatId) {
        return PlatformCredentials.builder()
                .platform(ChatPlatform.YOUTUBE)
                .studioId(studioId)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .liveChatId(liveChatId)
                .build();
    }

    /**
     * 치지직 인증 정보 생성
     */
    public static PlatformCredentials forChzzk(String studioId, String chzzkChannelId) {
        return PlatformCredentials.builder()
                .platform(ChatPlatform.CHZZK)
                .studioId(studioId)
                .chzzkChannelId(chzzkChannelId)
                .build();
    }
}
