package com.onetake.media.chat.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.MessageType;
import lombok.extern.slf4j.Slf4j;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * 치지직(CHZZK) 채팅 클라이언트
 *
 * 치지직은 WebSocket을 통해 실시간 채팅 제공
 *
 * WebSocket 연결:
 * wss://kr-ss{N}.chat.naver.com/chat (N은 서버 번호, 기본 1)
 *
 * 연결 과정:
 * 1. 채널 정보 조회: GET https://api.chzzk.naver.com/service/v1/channels/{channelId}
 * 2. 채팅 채널 ID 획득: chatChannelId
 * 3. WebSocket 연결 및 구독 메시지 전송
 *
 * 메시지 형식 (JSON):
 * {
 *   "cmd": 93101,  // 채팅 메시지
 *   "bdy": [{
 *     "msg": "채팅 내용",
 *     "msgTypeCode": 1,  // 1: 일반, 10: 후원
 *     "profile": "{"nickname":"닉네임"}",
 *     "extras": "{"payAmount":1000}"
 *   }]
 * }
 *
 * 주의: 이 클래스는 싱글톤이 아닙니다.
 * ChzzkChatClientFactory를 통해 스튜디오별로 새 인스턴스를 생성하세요.
 */
@Slf4j
public class ChzzkChatClient implements ExternalChatClient {

    private static final String CHZZK_API_BASE = "https://api.chzzk.naver.com";
    private static final String CHZZK_CHAT_WS_URL = "wss://kr-ss1.chat.naver.com/chat";

    // 치지직 명령어 코드
    private static final int CMD_CONNECT = 100;
    private static final int CMD_PING = 0;
    private static final int CMD_PONG = 10000;
    private static final int CMD_CHAT = 93101;
    private static final int CMD_DONATION = 93102;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private PlatformCredentials credentials;
    private ChzzkWebSocketClient webSocketClient;
    private String chatChannelId;

    // 수신된 메시지 버퍼
    private final ConcurrentLinkedQueue<ChatMessageRequest> messageBuffer = new ConcurrentLinkedQueue<>();

    /**
     * ChzzkChatClientFactory를 통해 생성하세요.
     */
    public ChzzkChatClient(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public ChatPlatform getPlatform() {
        return ChatPlatform.CHZZK;
    }

    @Override
    public void connect(PlatformCredentials credentials) {
        this.credentials = credentials;

        try {
            // 1. 채널 정보 조회하여 chatChannelId 획득
            this.chatChannelId = fetchChatChannelId(credentials.getChzzkChannelId());
            if (chatChannelId == null) {
                log.error("[Chzzk] Failed to get chat channel ID");
                return;
            }

            // 2. WebSocket 연결
            URI uri = new URI(CHZZK_CHAT_WS_URL);
            webSocketClient = new ChzzkWebSocketClient(uri);
            webSocketClient.connectBlocking();

            log.info("[Chzzk] Connected: channelId={}, chatChannelId={}",
                    credentials.getChzzkChannelId(), chatChannelId);
        } catch (Exception e) {
            log.error("[Chzzk] Failed to connect: {}", e.getMessage());
        }
    }

    @Override
    public void disconnect() {
        if (webSocketClient != null && webSocketClient.isOpen()) {
            try {
                webSocketClient.close();
            } catch (Exception e) {
                log.warn("[Chzzk] Error during disconnect: {}", e.getMessage());
            }
        }

        this.credentials = null;
        this.webSocketClient = null;
        this.chatChannelId = null;
        this.messageBuffer.clear();

        log.info("[Chzzk] Disconnected");
    }

    @Override
    public boolean isConnected() {
        return webSocketClient != null && webSocketClient.isOpen();
    }

    @Override
    public List<ChatMessageRequest> fetchNewMessages() {
        if (!isConnected()) {
            return List.of();
        }

        List<ChatMessageRequest> messages = new ArrayList<>();
        ChatMessageRequest message;
        while ((message = messageBuffer.poll()) != null) {
            messages.add(message);
        }

        log.debug("[Chzzk] Fetched {} messages", messages.size());
        return messages;
    }

    /**
     * 채널 정보 조회하여 chatChannelId 획득
     */
    private String fetchChatChannelId(String channelId) {
        try {
            String url = CHZZK_API_BASE + "/polling/v2/channels/" + channelId + "/live-status";

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0");

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode content = root.get("content");

                if (content != null && content.has("chatChannelId")) {
                    return content.get("chatChannelId").asText();
                }
            }
        } catch (Exception e) {
            log.error("[Chzzk] Failed to fetch channel info: {}", e.getMessage());
        }

        return null;
    }

    /**
     * 연결 메시지 생성
     */
    private String createConnectMessage() {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("cmd", CMD_CONNECT);
            root.put("ver", "2");

            ObjectNode bdy = objectMapper.createObjectNode();
            bdy.put("uid", (String) null);  // 비로그인
            bdy.put("devType", 2001);
            bdy.put("accTkn", (String) null);
            bdy.put("auth", "READ");

            ObjectNode svcid = objectMapper.createObjectNode();
            svcid.put("svcid", "game");
            svcid.put("cid", chatChannelId);

            bdy.set("sid", svcid);
            root.set("bdy", bdy);

            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            log.error("[Chzzk] Failed to create connect message: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Pong 메시지 생성
     */
    private String createPongMessage() {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("cmd", CMD_PONG);
            root.put("ver", "2");
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"cmd\":10000,\"ver\":\"2\"}";
        }
    }

    /**
     * WebSocket 메시지 파싱
     */
    private void parseWebSocketMessage(String jsonMessage) {
        try {
            JsonNode root = objectMapper.readTree(jsonMessage);
            int cmd = root.get("cmd").asInt();

            // PING 처리
            if (cmd == CMD_PING) {
                webSocketClient.send(createPongMessage());
                return;
            }

            // 채팅 메시지 처리
            if (cmd != CMD_CHAT && cmd != CMD_DONATION) {
                return;
            }

            JsonNode bdy = root.get("bdy");
            if (bdy == null || !bdy.isArray()) {
                return;
            }

            for (JsonNode msgNode : bdy) {
                parseChatMessage(msgNode);
            }
        } catch (Exception e) {
            log.warn("[Chzzk] Failed to parse message: {}", e.getMessage());
        }
    }

    /**
     * 개별 채팅 메시지 파싱
     */
    private void parseChatMessage(JsonNode msgNode) {
        try {
            String msg = msgNode.has("msg") ? msgNode.get("msg").asText() : "";
            int msgTypeCode = msgNode.has("msgTypeCode") ? msgNode.get("msgTypeCode").asInt() : 1;

            // profile은 JSON 문자열로 저장되어 있음
            String profileStr = msgNode.has("profile") ? msgNode.get("profile").asText() : null;
            String nickname = "Anonymous";
            String profileUrl = null;

            if (profileStr != null && !profileStr.isEmpty()) {
                try {
                    JsonNode profile = objectMapper.readTree(profileStr);
                    nickname = profile.has("nickname") ? profile.get("nickname").asText() : "Anonymous";
                    profileUrl = profile.has("profileImageUrl") ? profile.get("profileImageUrl").asText() : null;
                } catch (Exception e) {
                    // JSON 파싱 실패 시 기본값 사용
                }
            }

            // extras에서 후원 금액 추출
            Integer payAmount = null;
            String extrasStr = msgNode.has("extras") ? msgNode.get("extras").asText() : null;

            if (extrasStr != null && !extrasStr.isEmpty()) {
                try {
                    JsonNode extras = objectMapper.readTree(extrasStr);
                    if (extras.has("payAmount")) {
                        payAmount = extras.get("payAmount").asInt();
                    }
                } catch (Exception e) {
                    // JSON 파싱 실패 시 무시
                }
            }

            MessageType messageType = (msgTypeCode == 10 || payAmount != null)
                    ? MessageType.SUPER_CHAT
                    : MessageType.CHAT;

            ChatMessageRequest chatMessage = ChatMessageRequest.builder()
                    .studioId(String.valueOf(credentials.getStudioId()))
                    .platform(ChatPlatform.CHZZK)
                    .messageType(messageType)
                    .senderName(nickname)
                    .senderProfileUrl(profileUrl)
                    .content(msg)
                    .donationAmount(payAmount)
                    .donationCurrency(payAmount != null ? "KRW" : null)
                    .build();

            messageBuffer.offer(chatMessage);
        } catch (Exception e) {
            log.warn("[Chzzk] Failed to parse chat message: {}", e.getMessage());
        }
    }

    /**
     * 치지직 채팅 WebSocket 클라이언트
     */
    private class ChzzkWebSocketClient extends WebSocketClient {

        public ChzzkWebSocketClient(URI serverUri) {
            super(serverUri);
        }

        @Override
        public void onOpen(ServerHandshake handshake) {
            log.info("[Chzzk] WebSocket opened");

            // 연결 메시지 전송
            String connectMsg = createConnectMessage();
            if (connectMsg != null) {
                send(connectMsg);
                log.info("[Chzzk] Subscribed to chat: chatChannelId={}", chatChannelId);
            }
        }

        @Override
        public void onMessage(String message) {
            log.debug("[Chzzk] Raw message: {}", message);
            parseWebSocketMessage(message);
        }

        @Override
        public void onClose(int code, String reason, boolean remote) {
            log.info("[Chzzk] WebSocket closed: code={}, reason={}, remote={}",
                    code, reason, remote);
        }

        @Override
        public void onError(Exception ex) {
            log.error("[Chzzk] WebSocket error: {}", ex.getMessage());
        }
    }
}
