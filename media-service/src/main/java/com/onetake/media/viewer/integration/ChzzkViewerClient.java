package com.onetake.media.viewer.integration;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.integration.PlatformCredentials;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Random;

/**
 * 치지직(Chzzk) 실시간 시청자 수 조회 클라이언트
 *
 * TODO: 실제 치지직 API 연동 구현 필요
 * - 치지직 비공식 API 사용 (공식 API 미제공)
 * - 채널 정보 조회로 시청자 수 확인
 * - API 변경 가능성 있음
 */
@Slf4j
@Component
public class ChzzkViewerClient implements ExternalViewerClient {

    private boolean connected = false;
    private PlatformCredentials credentials;
    private String streamId;
    private final Random random = new Random();

    @Override
    public ChatPlatform getPlatform() {
        return ChatPlatform.CHZZK;
    }

    @Override
    public void connect(PlatformCredentials credentials) {
        this.credentials = credentials;
        this.streamId = credentials.getChzzkChannelId();
        this.connected = true;
        log.info("[Chzzk] Viewer client connected for channel: {}", streamId);
    }

    @Override
    public void disconnect() {
        this.connected = false;
        this.credentials = null;
        log.info("[Chzzk] Viewer client disconnected");
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public Optional<Long> fetchViewerCount() {
        if (!connected) {
            log.warn("[Chzzk] Cannot fetch viewer count - not connected");
            return Optional.empty();
        }

        // TODO: 실제 치지직 API 연동 구현
        // 치지직 비공식 API: GET https://api.chzzk.naver.com/service/v2/channels/{channelId}/live-detail
        // response: content.concurrentUserCount

        // Mock implementation - 테스트용 랜덤 시청자 수 반환
        long mockViewers = 30 + random.nextInt(200);
        log.debug("[Chzzk] Fetched viewer count: {} (mock)", mockViewers);
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
