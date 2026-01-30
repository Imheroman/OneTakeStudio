package com.onetake.media.chat.integration;

import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.MessageType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * 치지직(CHZZK) 채팅 클라이언트
 *
 * 치지직은 WebSocket을 통해 실시간 채팅 제공
 * 공식 API가 제한적이므로 비공식 방법 사용 필요
 *
 * WebSocket 연결:
 * wss://kr-ss{N}.chat.naver.com/chat  (N은 서버 번호)
 *
 * 연결 과정:
 * 1. 채널 정보 조회: GET https://api.chzzk.naver.com/service/v1/channels/{channelId}
 * 2. 채팅 채널 ID 획득: chatChannelId
 * 3. 액세스 토큰 조회 (로그인 시)
 * 4. WebSocket 연결 및 구독
 *
 * 메시지 형식 (JSON):
 * {
 *   "cmd": 93101,  // 채팅 메시지
 *   "bdy": {
 *     "msg": "채팅 내용",
 *     "msgTypeCode": 1,  // 1: 일반, 10: 후원
 *     "uid": "user123",
 *     "profile": {
 *       "nickname": "닉네임",
 *       "profileImageUrl": "https://..."
 *     },
 *     "extras": {
 *       "payAmount": 1000  // 후원 금액 (후원인 경우)
 *     }
 *   }
 * }
 */
@Slf4j
@Component
public class ChzzkChatClient implements ExternalChatClient {

    private PlatformCredentials credentials;
    private boolean connected = false;
    private String chatChannelId;

    // 수신된 메시지 버퍼
    private final ConcurrentLinkedQueue<ChatMessageRequest> messageBuffer = new ConcurrentLinkedQueue<>();

    @Override
    public ChatPlatform getPlatform() {
        return ChatPlatform.CHZZK;
    }

    @Override
    public void connect(PlatformCredentials credentials) {
        this.credentials = credentials;
        this.connected = true;

        log.info("Chzzk Chat connecting: channelId={}", credentials.getChzzkChannelId());

        // TODO: 치지직 채팅 연결 구현
        /*
        1. 채널 정보 조회
        GET https://api.chzzk.naver.com/service/v1/channels/{channelId}

        Response:
        {
            "content": {
                "channelId": "xxx",
                "channelName": "채널명",
                "chatChannelId": "xxx"  // 채팅방 ID
            }
        }

        2. 채팅 서버 정보 조회
        GET https://api.chzzk.naver.com/polling/v2/channels/{channelId}/live-status

        3. WebSocket 연결
        wss://kr-ss1.chat.naver.com/chat

        4. 구독 메시지 전송
        {
            "cmd": 100,  // CONNECT
            "bdy": {
                "uid": null,  // 비로그인
                "chatChannelId": "{chatChannelId}"
            }
        }

        5. onMessage 핸들러에서 cmd=93101 (채팅) 처리
        */
    }

    @Override
    public void disconnect() {
        this.connected = false;
        this.credentials = null;
        this.chatChannelId = null;
        this.messageBuffer.clear();

        log.info("Chzzk Chat disconnected");
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public List<ChatMessageRequest> fetchNewMessages() {
        if (!connected) {
            return List.of();
        }

        // 버퍼에서 메시지 꺼내기
        List<ChatMessageRequest> messages = new ArrayList<>();
        ChatMessageRequest message;
        while ((message = messageBuffer.poll()) != null) {
            messages.add(message);
        }

        log.debug("Chzzk Chat fetched {} messages", messages.size());
        return messages;
    }

    /**
     * WebSocket 메시지 파싱 (onMessage에서 호출)
     * TODO: 실제 구현 시 사용
     */
    private void parseWebSocketMessage(String jsonMessage) {
        // TODO: JSON 파싱 구현
        /*
        JsonNode root = objectMapper.readTree(jsonMessage);
        int cmd = root.get("cmd").asInt();

        if (cmd != 93101) {  // 채팅 메시지가 아니면 무시
            return;
        }

        JsonNode bdy = root.get("bdy");
        String msg = bdy.get("msg").asText();
        int msgTypeCode = bdy.get("msgTypeCode").asInt();
        JsonNode profile = bdy.get("profile");

        String nickname = profile.get("nickname").asText();
        String profileUrl = profile.has("profileImageUrl")
            ? profile.get("profileImageUrl").asText() : null;

        Integer payAmount = null;
        if (bdy.has("extras") && bdy.get("extras").has("payAmount")) {
            payAmount = bdy.get("extras").get("payAmount").asInt();
        }

        ChatMessageRequest chatMessage = ChatMessageRequest.builder()
            .studioId(credentials.getStudioId())
            .platform(ChatPlatform.CHZZK)
            .messageType(msgTypeCode == 10 ? MessageType.SUPER_CHAT : MessageType.CHAT)
            .senderName(nickname)
            .senderProfileUrl(profileUrl)
            .content(msg)
            .donationAmount(payAmount)
            .donationCurrency(payAmount != null ? "KRW" : null)
            .build();

        messageBuffer.offer(chatMessage);
        */
    }
}
