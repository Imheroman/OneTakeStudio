package com.onetake.media.viewer.integration;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.integration.PlatformCredentials;

import java.util.Optional;

/**
 * 외부 플랫폼 시청자 수 조회 인터페이스
 *
 * YouTube, Twitch, 치지직 등 외부 플랫폼에서 실시간 시청자 수를 가져오는 클라이언트의 공통 인터페이스
 */
public interface ExternalViewerClient {

    /**
     * 지원하는 플랫폼
     */
    ChatPlatform getPlatform();

    /**
     * 연결 시작
     * @param credentials 플랫폼별 인증 정보 (OAuth 토큰, API 키 등)
     */
    void connect(PlatformCredentials credentials);

    /**
     * 연결 종료
     */
    void disconnect();

    /**
     * 연결 상태 확인
     */
    boolean isConnected();

    /**
     * 현재 시청자 수 조회
     * @return 현재 시청자 수 (조회 실패 시 empty)
     */
    Optional<Long> fetchViewerCount();

    /**
     * 스트림 ID 설정 (라이브 방송 ID)
     * @param streamId 플랫폼별 스트림/방송 ID
     */
    void setStreamId(String streamId);

    /**
     * 현재 설정된 스트림 ID
     */
    String getStreamId();
}
