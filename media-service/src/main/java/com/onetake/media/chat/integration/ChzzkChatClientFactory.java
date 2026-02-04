package com.onetake.media.chat.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * ChzzkChatClient 팩토리
 *
 * 스튜디오별로 독립적인 ChzzkChatClient 인스턴스를 생성합니다.
 * 이를 통해 여러 스튜디오가 동시에 치지직 채팅을 연동해도 상태 충돌이 발생하지 않습니다.
 */
@Component
@RequiredArgsConstructor
public class ChzzkChatClientFactory {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 새로운 ChzzkChatClient 인스턴스 생성
     */
    public ChzzkChatClient create() {
        return new ChzzkChatClient(restTemplate, objectMapper);
    }
}
