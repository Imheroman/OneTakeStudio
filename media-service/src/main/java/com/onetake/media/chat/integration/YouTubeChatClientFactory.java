package com.onetake.media.chat.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * YouTubeChatClient 팩토리
 *
 * 스튜디오별로 독립적인 YouTubeChatClient 인스턴스를 생성합니다.
 * 이를 통해 여러 스튜디오가 동시에 YouTube 채팅을 연동해도 상태 충돌이 발생하지 않습니다.
 */
@Component
@RequiredArgsConstructor
public class YouTubeChatClientFactory {

    private final ObjectMapper objectMapper;

    @Value("${youtube.oauth.client-id}")
    private String clientId;

    @Value("${youtube.oauth.client-secret}")
    private String clientSecret;

    /**
     * 새로운 YouTubeChatClient 인스턴스 생성
     */
    public YouTubeChatClient create() {
        return new YouTubeChatClient(objectMapper, clientId, clientSecret);
    }
}
