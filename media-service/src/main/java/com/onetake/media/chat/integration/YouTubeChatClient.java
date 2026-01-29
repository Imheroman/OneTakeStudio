package com.onetake.media.chat.integration;

import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.MessageType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

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
 * Polling 주기: YouTube 권장 5초 (pollingIntervalMillis 응답값 사용)
 */
@Slf4j
@Component
public class YouTubeChatClient implements ExternalChatClient {

    private PlatformCredentials credentials;
    private boolean connected = false;
    private String nextPageToken;

    @Override
    public ChatPlatform getPlatform() {
        return ChatPlatform.YOUTUBE;
    }

    @Override
    public void connect(PlatformCredentials credentials) {
        this.credentials = credentials;
        this.connected = true;
        this.nextPageToken = null;

        log.info("YouTube Chat connected: liveChatId={}", credentials.getLiveChatId());

        // TODO: YouTube API 연결 검증
        // GET https://www.googleapis.com/youtube/v3/liveChatMessages
        //   ?liveChatId={liveChatId}
        //   &part=snippet,authorDetails
        //   &maxResults=200
        //   Authorization: Bearer {accessToken}
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
        return connected;
    }

    @Override
    public List<ChatMessageRequest> fetchNewMessages() {
        if (!connected || credentials == null) {
            return List.of();
        }

        List<ChatMessageRequest> messages = new ArrayList<>();

        // TODO: YouTube Live Chat API 호출 구현
        /*
        YouTube API 호출:
        GET https://www.googleapis.com/youtube/v3/liveChatMessages
            ?liveChatId={credentials.getLiveChatId()}
            &part=snippet,authorDetails
            &pageToken={nextPageToken}  // 있는 경우
            &maxResults=200

        Headers:
            Authorization: Bearer {credentials.getAccessToken()}

        Response 파싱:
        {
            "pollingIntervalMillis": 5000,  // 다음 폴링까지 대기 시간
            "nextPageToken": "xxx",          // 다음 요청에 사용
            "items": [
                {
                    "id": "messageId",
                    "snippet": {
                        "liveChatId": "xxx",
                        "type": "textMessageEvent",  // 또는 "superChatEvent"
                        "publishedAt": "2024-01-01T00:00:00.000Z",
                        "textMessageDetails": {
                            "messageText": "Hello!"
                        },
                        "superChatDetails": {  // 슈퍼챗인 경우
                            "amountMicros": 1000000,
                            "currency": "KRW",
                            "userComment": "슈퍼챗 메시지"
                        }
                    },
                    "authorDetails": {
                        "channelId": "UCxxx",
                        "displayName": "UserName",
                        "profileImageUrl": "https://..."
                    }
                }
            ]
        }

        for (item : items) {
            ChatMessageRequest message = ChatMessageRequest.builder()
                .studioId(credentials.getStudioId())
                .platform(ChatPlatform.YOUTUBE)
                .messageType(item.snippet.type.equals("superChatEvent")
                    ? MessageType.SUPER_CHAT : MessageType.CHAT)
                .senderName(item.authorDetails.displayName)
                .senderProfileUrl(item.authorDetails.profileImageUrl)
                .content(item.snippet.textMessageDetails.messageText)
                .externalMessageId(item.id)
                .donationAmount(item.snippet.superChatDetails?.amountMicros / 1000000)
                .donationCurrency(item.snippet.superChatDetails?.currency)
                .build();

            messages.add(message);
        }

        this.nextPageToken = response.nextPageToken;
        */

        log.debug("YouTube Chat fetched {} messages", messages.size());
        return messages;
    }

    @Override
    public boolean sendMessage(String message) {
        if (!connected || credentials == null) {
            return false;
        }

        // TODO: YouTube Live Chat 메시지 전송 구현
        /*
        POST https://www.googleapis.com/youtube/v3/liveChatMessages
            ?part=snippet

        Body:
        {
            "snippet": {
                "liveChatId": "{credentials.getLiveChatId()}",
                "type": "textMessageEvent",
                "textMessageDetails": {
                    "messageText": "{message}"
                }
            }
        }

        Headers:
            Authorization: Bearer {credentials.getAccessToken()}
            Content-Type: application/json
        */

        log.info("YouTube Chat message sent: {}", message);
        return true;
    }
}
