package com.onetake.media.chat.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.MessageType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * YouTube Live Chat API 클라이언트
 *
 * YouTube Data API v3의 LiveChatMessages를 사용하여 채팅을 가져옴
 *
 * API 문서: https://developers.google.com/youtube/v3/live/docs/liveChatMessages
 *
 * 필요한 OAuth Scope:
 * - https://www.googleapis.com/auth/youtube.readonly (읽기)
 * - https://www.googleapis.com/auth/youtube (쓰기)
 *
 * 주의: 이 클래스는 싱글톤이 아닙니다.
 * YouTubeChatClientFactory를 통해 스튜디오별로 새 인스턴스를 생성하세요.
 */
@Slf4j
public class YouTubeChatClient implements ExternalChatClient {

    private static final String YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
    private static final String LIVE_CHAT_MESSAGES_ENDPOINT = "/liveChat/messages";
    private static final String OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String clientId;
    private final String clientSecret;

    private PlatformCredentials credentials;
    private boolean connected = false;
    private String nextPageToken;
    private long pollingIntervalMillis = 5000;

    /**
     * YouTubeChatClientFactory를 통해 생성하세요.
     */
    public YouTubeChatClient(ObjectMapper objectMapper, String clientId, String clientSecret) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    @Override
    public ChatPlatform getPlatform() {
        return ChatPlatform.YOUTUBE;
    }

    @Override
    public void connect(PlatformCredentials credentials) {
        this.credentials = credentials;
        this.nextPageToken = null;

        try {
            // API 연결 검증 - 첫 번째 메시지 조회 시도
            String url = buildMessagesUrl(false);
            HttpEntity<Void> entity = new HttpEntity<>(createAuthHeaders());

            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                this.connected = true;
                JsonNode root = objectMapper.readTree(response.getBody());

                // 다음 페이지 토큰 저장
                if (root.has("nextPageToken")) {
                    this.nextPageToken = root.get("nextPageToken").asText();
                }

                // 폴링 간격 업데이트
                if (root.has("pollingIntervalMillis")) {
                    this.pollingIntervalMillis = root.get("pollingIntervalMillis").asLong();
                }

                log.info("[YouTube] Connected successfully: liveChatId={}", credentials.getLiveChatId());
            }
        } catch (HttpClientErrorException.Unauthorized e) {
            log.warn("[YouTube] Token expired, attempting refresh");
            if (refreshAccessToken()) {
                connect(this.credentials);
            } else {
                log.error("[YouTube] Failed to connect: token refresh failed");
            }
        } catch (Exception e) {
            log.error("[YouTube] Failed to connect: {}", e.getMessage());
            this.connected = false;
        }
    }

    @Override
    public void disconnect() {
        this.connected = false;
        this.credentials = null;
        this.nextPageToken = null;

        log.info("[YouTube] Disconnected");
    }

    @Override
    public boolean isConnected() {
        return connected && credentials != null;
    }

    @Override
    public List<ChatMessageRequest> fetchNewMessages() {
        if (!isConnected()) {
            return List.of();
        }

        List<ChatMessageRequest> messages = new ArrayList<>();

        try {
            String url = buildMessagesUrl(true);
            HttpEntity<Void> entity = new HttpEntity<>(createAuthHeaders());

            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode root = objectMapper.readTree(response.getBody());

                // 다음 페이지 토큰 업데이트
                if (root.has("nextPageToken")) {
                    this.nextPageToken = root.get("nextPageToken").asText();
                }

                // 폴링 간격 업데이트
                if (root.has("pollingIntervalMillis")) {
                    this.pollingIntervalMillis = root.get("pollingIntervalMillis").asLong();
                }

                // 메시지 파싱
                JsonNode items = root.get("items");
                if (items != null && items.isArray()) {
                    for (JsonNode item : items) {
                        ChatMessageRequest message = parseMessage(item);
                        if (message != null) {
                            messages.add(message);
                        }
                    }
                }

                log.debug("[YouTube] Fetched {} messages", messages.size());
            }
        } catch (HttpClientErrorException.Unauthorized e) {
            log.warn("[YouTube] Token expired during fetch, attempting refresh");
            if (refreshAccessToken()) {
                return fetchNewMessages();
            }
            this.connected = false;
        } catch (Exception e) {
            log.error("[YouTube] Failed to fetch messages: {}", e.getMessage());
        }

        return messages;
    }

    @Override
    public boolean sendMessage(String message) {
        if (!isConnected()) {
            return false;
        }

        try {
            String url = YOUTUBE_API_BASE_URL + LIVE_CHAT_MESSAGES_ENDPOINT + "?part=snippet";

            String requestBody = objectMapper.writeValueAsString(new SendMessageBody(
                    new Snippet(
                            credentials.getLiveChatId(),
                            "textMessageEvent",
                            new TextMessageDetails(message)
                    )
            ));

            HttpHeaders headers = createAuthHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[YouTube] Message sent successfully");
                return true;
            }
        } catch (HttpClientErrorException.Unauthorized e) {
            log.warn("[YouTube] Token expired during send, attempting refresh");
            if (refreshAccessToken()) {
                return sendMessage(message);
            }
        } catch (Exception e) {
            log.error("[YouTube] Failed to send message: {}", e.getMessage());
        }

        return false;
    }

    /**
     * 권장 폴링 간격 반환 (밀리초)
     */
    public long getPollingIntervalMillis() {
        return pollingIntervalMillis;
    }

    private String buildMessagesUrl(boolean usePageToken) {
        StringBuilder url = new StringBuilder(YOUTUBE_API_BASE_URL)
                .append(LIVE_CHAT_MESSAGES_ENDPOINT)
                .append("?liveChatId=").append(credentials.getLiveChatId())
                .append("&part=snippet,authorDetails")
                .append("&maxResults=200");

        if (usePageToken && nextPageToken != null) {
            url.append("&pageToken=").append(nextPageToken);
        }

        return url.toString();
    }

    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(credentials.getAccessToken());
        return headers;
    }

    private ChatMessageRequest parseMessage(JsonNode item) {
        try {
            String messageId = item.get("id").asText();
            JsonNode snippet = item.get("snippet");
            JsonNode authorDetails = item.get("authorDetails");

            String type = snippet.get("type").asText();
            String displayName = authorDetails.get("displayName").asText();
            String profileImageUrl = authorDetails.has("profileImageUrl")
                    ? authorDetails.get("profileImageUrl").asText() : null;

            String content;
            Integer donationAmount = null;
            String donationCurrency = null;
            MessageType messageType = MessageType.CHAT;

            if ("superChatEvent".equals(type)) {
                JsonNode superChatDetails = snippet.get("superChatDetails");
                content = superChatDetails.has("userComment")
                        ? superChatDetails.get("userComment").asText() : "";
                donationAmount = (int) (superChatDetails.get("amountMicros").asLong() / 1_000_000);
                donationCurrency = superChatDetails.get("currency").asText();
                messageType = MessageType.SUPER_CHAT;
            } else if ("superStickerEvent".equals(type)) {
                JsonNode superStickerDetails = snippet.get("superStickerDetails");
                content = "[Super Sticker]";
                donationAmount = (int) (superStickerDetails.get("amountMicros").asLong() / 1_000_000);
                donationCurrency = superStickerDetails.get("currency").asText();
                messageType = MessageType.SUPER_CHAT;
            } else {
                JsonNode textMessageDetails = snippet.get("textMessageDetails");
                content = textMessageDetails != null
                        ? textMessageDetails.get("messageText").asText() : "";
            }

            return ChatMessageRequest.builder()
                    .studioId(credentials.getStudioId())
                    .platform(ChatPlatform.YOUTUBE)
                    .messageType(messageType)
                    .senderName(displayName)
                    .senderProfileUrl(profileImageUrl)
                    .content(content)
                    .externalMessageId(messageId)
                    .donationAmount(donationAmount)
                    .donationCurrency(donationCurrency)
                    .build();
        } catch (Exception e) {
            log.warn("[YouTube] Failed to parse message: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Access Token 갱신
     */
    private boolean refreshAccessToken() {
        if (credentials.getRefreshToken() == null) {
            log.error("[YouTube] No refresh token available");
            return false;
        }

        try {
            String requestBody = "grant_type=refresh_token" +
                    "&refresh_token=" + credentials.getRefreshToken() +
                    "&client_id=" + clientId +
                    "&client_secret=" + clientSecret;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    OAUTH_TOKEN_ENDPOINT, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String newAccessToken = root.get("access_token").asText();

                // credentials 업데이트
                this.credentials = PlatformCredentials.builder()
                        .platform(credentials.getPlatform())
                        .studioId(credentials.getStudioId())
                        .accessToken(newAccessToken)
                        .refreshToken(credentials.getRefreshToken())
                        .liveChatId(credentials.getLiveChatId())
                        .broadcastId(credentials.getBroadcastId())
                        .build();

                log.info("[YouTube] Access token refreshed successfully");
                return true;
            }
        } catch (Exception e) {
            log.error("[YouTube] Failed to refresh token: {}", e.getMessage());
        }

        return false;
    }

    // 메시지 전송용 내부 클래스들
    private record SendMessageBody(Snippet snippet) {}
    private record Snippet(String liveChatId, String type, TextMessageDetails textMessageDetails) {}
    private record TextMessageDetails(String messageText) {}
}
