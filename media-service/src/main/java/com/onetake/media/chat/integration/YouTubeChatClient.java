package com.onetake.media.chat.integration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.MessageType;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

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
 */
@Slf4j
@Component
public class YouTubeChatClient implements ExternalChatClient {

    private static final String YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
    private static final String LIVE_CHAT_MESSAGES_URL = YOUTUBE_API_BASE + "/liveChat/messages";

    private final RestTemplate restTemplate;

    private PlatformCredentials credentials;
    private boolean connected = false;
    private String nextPageToken;

    public YouTubeChatClient() {
        this.restTemplate = new RestTemplate();
    }

    @Override
    public ChatPlatform getPlatform() {
        return ChatPlatform.YOUTUBE;
    }

    @Override
    public void connect(PlatformCredentials credentials) {
        this.credentials = credentials;
        this.nextPageToken = null;

        // 연결 검증: 첫 API 호출로 확인
        try {
            String url = UriComponentsBuilder.fromHttpUrl(LIVE_CHAT_MESSAGES_URL)
                    .queryParam("liveChatId", credentials.getLiveChatId())
                    .queryParam("part", "snippet,authorDetails")
                    .queryParam("maxResults", 1)
                    .toUriString();

            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<YouTubeLiveChatResponse> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, YouTubeLiveChatResponse.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                this.connected = true;
                log.info("YouTube Chat connected: liveChatId={}, studioId={}",
                        credentials.getLiveChatId(), credentials.getStudioId());
            }
        } catch (RestClientException e) {
            log.error("YouTube Chat connection failed: {}", e.getMessage());
            this.connected = false;
        }
    }

    @Override
    public void disconnect() {
        this.connected = false;
        this.credentials = null;
        this.nextPageToken = null;
        log.info("YouTube Chat disconnected");
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
            UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromHttpUrl(LIVE_CHAT_MESSAGES_URL)
                    .queryParam("liveChatId", credentials.getLiveChatId())
                    .queryParam("part", "snippet,authorDetails")
                    .queryParam("maxResults", 200);

            // 이전 페이지 토큰이 있으면 추가 (중복 방지)
            if (nextPageToken != null) {
                uriBuilder.queryParam("pageToken", nextPageToken);
            }

            HttpHeaders headers = createAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<YouTubeLiveChatResponse> response = restTemplate.exchange(
                    uriBuilder.toUriString(), HttpMethod.GET, entity, YouTubeLiveChatResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                YouTubeLiveChatResponse body = response.getBody();

                // 다음 페이지 토큰 저장
                this.nextPageToken = body.getNextPageToken();

                // 메시지 변환
                if (body.getItems() != null) {
                    for (YouTubeLiveChatMessage item : body.getItems()) {
                        ChatMessageRequest message = convertToRequest(item);
                        if (message != null) {
                            messages.add(message);
                        }
                    }
                }
            }

            if (!messages.isEmpty()) {
                log.debug("YouTube Chat fetched {} messages", messages.size());
            }

        } catch (RestClientException e) {
            log.error("YouTube Chat fetch failed: {}", e.getMessage());
            // 401/403 에러 시 연결 해제
            if (e.getMessage() != null && (e.getMessage().contains("401") || e.getMessage().contains("403"))) {
                log.warn("YouTube token expired or invalid, disconnecting...");
                this.connected = false;
            }
        }

        return messages;
    }

    @Override
    public boolean sendMessage(String message) {
        if (!isConnected()) {
            return false;
        }

        try {
            HttpHeaders headers = createAuthHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // 요청 본문 구성
            YouTubeSendMessageRequest requestBody = new YouTubeSendMessageRequest();
            requestBody.setSnippet(new YouTubeSendMessageRequest.Snippet(
                    credentials.getLiveChatId(),
                    "textMessageEvent",
                    new YouTubeSendMessageRequest.TextMessageDetails(message)
            ));

            String url = UriComponentsBuilder.fromHttpUrl(LIVE_CHAT_MESSAGES_URL)
                    .queryParam("part", "snippet")
                    .toUriString();

            HttpEntity<YouTubeSendMessageRequest> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("YouTube Chat message sent successfully");
                return true;
            }

        } catch (RestClientException e) {
            log.error("YouTube Chat send failed: {}", e.getMessage());
        }

        return false;
    }

    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(credentials.getAccessToken());
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        return headers;
    }

    private ChatMessageRequest convertToRequest(YouTubeLiveChatMessage item) {
        if (item.getSnippet() == null || item.getAuthorDetails() == null) {
            return null;
        }

        YouTubeLiveChatMessage.Snippet snippet = item.getSnippet();
        YouTubeLiveChatMessage.AuthorDetails author = item.getAuthorDetails();

        // 메시지 타입 결정
        MessageType messageType = MessageType.CHAT;
        String content = "";
        Integer donationAmount = null;
        String donationCurrency = null;

        if ("superChatEvent".equals(snippet.getType()) && snippet.getSuperChatDetails() != null) {
            messageType = MessageType.SUPER_CHAT;
            content = snippet.getSuperChatDetails().getUserComment();
            // amountMicros는 마이크로 단위 (1,000,000 = 1원)
            if (snippet.getSuperChatDetails().getAmountMicros() != null) {
                donationAmount = (int) (snippet.getSuperChatDetails().getAmountMicros() / 1_000_000);
            }
            donationCurrency = snippet.getSuperChatDetails().getCurrency();
        } else if (snippet.getTextMessageDetails() != null) {
            content = snippet.getTextMessageDetails().getMessageText();
        }

        // 빈 메시지 무시
        if (content == null || content.isBlank()) {
            return null;
        }

        return ChatMessageRequest.builder()
                .studioId(credentials.getStudioId())
                .platform(ChatPlatform.YOUTUBE)
                .messageType(messageType)
                .senderName(author.getDisplayName())
                .senderProfileUrl(author.getProfileImageUrl())
                .content(content)
                .externalMessageId(item.getId())
                .donationAmount(donationAmount)
                .donationCurrency(donationCurrency)
                .build();
    }

    // ==================== YouTube API DTOs ====================

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class YouTubeLiveChatResponse {
        private String nextPageToken;
        private Long pollingIntervalMillis;
        private List<YouTubeLiveChatMessage> items;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class YouTubeLiveChatMessage {
        private String id;
        private Snippet snippet;
        private AuthorDetails authorDetails;

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Snippet {
            private String liveChatId;
            private String type;
            private String publishedAt;
            private TextMessageDetails textMessageDetails;
            private SuperChatDetails superChatDetails;
        }

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class TextMessageDetails {
            private String messageText;
        }

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class SuperChatDetails {
            private Long amountMicros;
            private String currency;
            private String userComment;
        }

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class AuthorDetails {
            private String channelId;
            private String displayName;
            private String profileImageUrl;
            @JsonProperty("isChatOwner")
            private boolean chatOwner;
            @JsonProperty("isChatModerator")
            private boolean chatModerator;
        }
    }

    @Data
    public static class YouTubeSendMessageRequest {
        private Snippet snippet;

        @Data
        public static class Snippet {
            private String liveChatId;
            private String type;
            private TextMessageDetails textMessageDetails;

            public Snippet(String liveChatId, String type, TextMessageDetails textMessageDetails) {
                this.liveChatId = liveChatId;
                this.type = type;
                this.textMessageDetails = textMessageDetails;
            }
        }

        @Data
        public static class TextMessageDetails {
            private String messageText;

            public TextMessageDetails(String messageText) {
                this.messageText = messageText;
            }
        }
    }
}
