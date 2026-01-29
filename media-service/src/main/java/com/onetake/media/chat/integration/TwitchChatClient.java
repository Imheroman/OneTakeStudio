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
 * Twitch IRC 채팅 클라이언트
 *
 * Twitch는 IRC 프로토콜을 사용하여 채팅을 제공
 * WebSocket으로 연결: wss://irc-ws.chat.twitch.tv:443
 *
 * IRC 명령어:
 * - PASS oauth:{accessToken}
 * - NICK {username}
 * - JOIN #{channelName}
 * - PRIVMSG #{channelName} :{message}
 *
 * 필요한 OAuth Scope:
 * - chat:read (채팅 읽기)
 * - chat:edit (채팅 쓰기)
 *
 * 메시지 형식:
 * @badge-info=;badges=broadcaster/1;...;display-name=UserName;... :username!username@username.tmi.twitch.tv PRIVMSG #channel :메시지 내용
 */
@Slf4j
@Component
public class TwitchChatClient implements ExternalChatClient {

    private PlatformCredentials credentials;
    private boolean connected = false;

    // 수신된 메시지 버퍼 (IRC WebSocket에서 수신한 메시지를 저장)
    private final ConcurrentLinkedQueue<ChatMessageRequest> messageBuffer = new ConcurrentLinkedQueue<>();

    @Override
    public ChatPlatform getPlatform() {
        return ChatPlatform.TWITCH;
    }

    @Override
    public void connect(PlatformCredentials credentials) {
        this.credentials = credentials;
        this.connected = true;

        log.info("Twitch Chat connecting: channel={}", credentials.getChannelName());

        // TODO: Twitch IRC WebSocket 연결 구현
        /*
        WebSocket 연결: wss://irc-ws.chat.twitch.tv:443

        연결 후 전송:
        1. CAP REQ :twitch.tv/tags twitch.tv/commands  // 태그 활성화
        2. PASS oauth:{credentials.getAccessToken()}
        3. NICK {botUsername}
        4. JOIN #{credentials.getChannelName()}

        WebSocket onMessage 핸들러:
        - PING :tmi.twitch.tv → PONG :tmi.twitch.tv 응답
        - PRIVMSG 파싱하여 messageBuffer에 추가

        PRIVMSG 파싱 예시:
        @badge-info=subscriber/12;badges=subscriber/12,bits/100;
         color=#FF0000;display-name=UserName;emotes=;
         first-msg=0;id=xxx-xxx-xxx;mod=0;
         room-id=12345;subscriber=1;tmi-sent-ts=1234567890;
         turbo=0;user-id=67890;user-type=
         :username!username@username.tmi.twitch.tv PRIVMSG #channel :채팅 메시지

        파싱 결과:
        - display-name: 사용자 표시명
        - id: 메시지 고유 ID
        - 마지막 : 이후가 메시지 내용
        - bits가 있으면 비트 도네이션
        */
    }

    @Override
    public void disconnect() {
        this.connected = false;
        this.credentials = null;
        this.messageBuffer.clear();

        // TODO: WebSocket 연결 종료
        // PART #{channelName}
        // WebSocket.close()

        log.info("Twitch Chat disconnected");
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

        log.debug("Twitch Chat fetched {} messages", messages.size());
        return messages;
    }

    @Override
    public boolean sendMessage(String message) {
        if (!connected || credentials == null) {
            return false;
        }

        // TODO: Twitch IRC 메시지 전송 구현
        /*
        WebSocket으로 전송:
        PRIVMSG #{credentials.getChannelName()} :{message}
        */

        log.info("Twitch Chat message sent: {}", message);
        return true;
    }

    /**
     * IRC 메시지 파싱 (WebSocket onMessage에서 호출)
     * TODO: 실제 구현 시 사용
     */
    private void parseIrcMessage(String rawMessage) {
        // @tags :user!user@user.tmi.twitch.tv PRIVMSG #channel :message
        if (!rawMessage.contains("PRIVMSG")) {
            return;
        }

        // TODO: 정규식으로 파싱
        /*
        String displayName = extractTag(rawMessage, "display-name");
        String messageId = extractTag(rawMessage, "id");
        String bits = extractTag(rawMessage, "bits");
        String content = rawMessage.substring(rawMessage.lastIndexOf(" :") + 2);

        ChatMessageRequest chatMessage = ChatMessageRequest.builder()
            .studioId(credentials.getStudioId())
            .platform(ChatPlatform.TWITCH)
            .messageType(bits != null ? MessageType.SUPER_CHAT : MessageType.CHAT)
            .senderName(displayName)
            .content(content)
            .externalMessageId(messageId)
            .donationAmount(bits != null ? Integer.parseInt(bits) : null)
            .donationCurrency(bits != null ? "BITS" : null)
            .build();

        messageBuffer.offer(chatMessage);
        */
    }
}
