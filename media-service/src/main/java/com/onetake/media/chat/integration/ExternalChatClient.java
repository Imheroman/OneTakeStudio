package com.onetake.media.chat.integration;

import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.entity.ChatPlatform;

import java.util.List;

/**
 * 외부 플랫폼 채팅 연동 인터페이스
 *
 * YouTube, Twitch, 치지직 등 외부 플랫폼에서 채팅을 가져오는 클라이언트의 공통 인터페이스
 */
public interface ExternalChatClient {

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
     * 새 메시지 가져오기 (Polling 방식)
     * @return 새로 수신된 메시지 목록
     */
    List<ChatMessageRequest> fetchNewMessages();

    /**
     * 메시지 전송 (양방향 지원 시)
     * @param message 전송할 메시지
     * @return 전송 성공 여부
     */
    default boolean sendMessage(String message) {
        // 기본적으로 미지원
        return false;
    }
}
