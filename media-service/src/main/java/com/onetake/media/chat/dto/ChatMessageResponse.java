package com.onetake.media.chat.dto;

import com.onetake.media.chat.entity.ChatMessage;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageResponse {

    private String messageId;
    private Long studioId;
    private ChatPlatform platform;
    private MessageType messageType;
    private Long userId;
    private String senderName;
    private String senderProfileUrl;
    private String content;
    private Integer donationAmount;
    private String donationCurrency;
    private Boolean isHighlighted;
    private LocalDateTime createdAt;

    public static ChatMessageResponse from(ChatMessage message) {
        return ChatMessageResponse.builder()
                .messageId(message.getMessageId())
                .studioId(message.getStudioId())
                .platform(message.getPlatform())
                .messageType(message.getMessageType())
                .userId(message.getUserId())
                .senderName(message.getSenderName())
                .senderProfileUrl(message.getSenderProfileUrl())
                .content(message.getContent())
                .donationAmount(message.getDonationAmount())
                .donationCurrency(message.getDonationCurrency())
                .isHighlighted(message.getIsHighlighted())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
