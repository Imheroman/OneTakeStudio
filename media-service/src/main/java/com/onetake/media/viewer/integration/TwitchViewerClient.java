package com.onetake.media.viewer.integration;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.integration.PlatformCredentials;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Random;

/**
 * Twitch 실시간 시청자 수 조회 클라이언트
 *
 * TODO: 실제 Twitch API 연동 구현 필요
 * - Twitch Helix API 사용
 * - streams endpoint로 viewer_count 조회
 * - OAuth 2.0 인증 필요 (Client ID + Access Token)
 */
@Slf4j
@Component
public class TwitchViewerClient implements ExternalViewerClient {

    private boolean connected = false;
    private PlatformCredentials credentials;
    private String streamId;
    private final Random random = new Random();

    @Override
    public ChatPlatform getPlatform() {
        return ChatPlatform.TWITCH;
    }

    @Override
    public void connect(PlatformCredentials credentials) {
        this.credentials = credentials;
        this.streamId = credentials.getChannelId();
        this.connected = true;
        log.info("[Twitch] Viewer client connected for channel: {}", credentials.getChannelName());
    }

    @Override
    public void disconnect() {
        this.connected = false;
        this.credentials = null;
        log.info("[Twitch] Viewer client disconnected");
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public Optional<Long> fetchViewerCount() {
        if (!connected) {
            log.warn("[Twitch] Cannot fetch viewer count - not connected");
            return Optional.empty();
        }

        // TODO: 실제 Twitch API 연동 구현
        // Twitch Helix API: GET https://api.twitch.tv/helix/streams
        // Headers: Client-ID, Authorization: Bearer {access_token}
        // parameters: user_id={channelId}
        // response: data[0].viewer_count

        // Mock implementation - 테스트용 랜덤 시청자 수 반환
        long mockViewers = 50 + random.nextInt(300);
        log.debug("[Twitch] Fetched viewer count: {} (mock)", mockViewers);
        return Optional.of(mockViewers);
    }

    @Override
    public void setStreamId(String streamId) {
        this.streamId = streamId;
    }

    @Override
    public String getStreamId() {
        return streamId;
    }
}
