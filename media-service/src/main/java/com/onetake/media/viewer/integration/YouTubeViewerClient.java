package com.onetake.media.viewer.integration;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.integration.PlatformCredentials;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Random;

/**
 * YouTube 실시간 시청자 수 조회 클라이언트
 *
 * TODO: 실제 YouTube Data API v3 연동 구현 필요
 * - YouTube Live Streaming API 사용
 * - livebroadcasts.list API로 concurrentViewers 조회
 * - OAuth 2.0 인증 필요
 */
@Slf4j
@Component
public class YouTubeViewerClient implements ExternalViewerClient {

    private boolean connected = false;
    private PlatformCredentials credentials;
    private String streamId;
    private final Random random = new Random();

    @Override
    public ChatPlatform getPlatform() {
        return ChatPlatform.YOUTUBE;
    }

    @Override
    public void connect(PlatformCredentials credentials) {
        this.credentials = credentials;
        this.streamId = credentials.getBroadcastId();
        this.connected = true;
        log.info("[YouTube] Viewer client connected for broadcast: {}", streamId);
    }

    @Override
    public void disconnect() {
        this.connected = false;
        this.credentials = null;
        log.info("[YouTube] Viewer client disconnected");
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public Optional<Long> fetchViewerCount() {
        if (!connected) {
            log.warn("[YouTube] Cannot fetch viewer count - not connected");
            return Optional.empty();
        }

        // TODO: 실제 YouTube API 연동 구현
        // YouTube Data API v3: GET https://www.googleapis.com/youtube/v3/videos
        // parameters: part=liveStreamingDetails, id={videoId}
        // response: liveStreamingDetails.concurrentViewers

        // Mock implementation - 테스트용 랜덤 시청자 수 반환
        long mockViewers = 100 + random.nextInt(500);
        log.debug("[YouTube] Fetched viewer count: {} (mock)", mockViewers);
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
