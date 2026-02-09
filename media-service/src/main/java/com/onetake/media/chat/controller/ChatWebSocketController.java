package com.onetake.media.chat.controller;

import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.dto.ChatMessageResponse;
import com.onetake.media.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final ChatService chatService;

    @MessageMapping("/chat/{studioId}/send")
    public void sendMessage(
            @DestinationVariable String studioId,
            @Payload ChatMessageRequest request,
            SimpMessageHeaderAccessor headerAccessor) {

        // WebSocket 세션에서 사용자 ID 추출 (헤더 또는 세션 속성)
        String odUserId = extractOdUserId(headerAccessor);

        // studioId 설정
        ChatMessageRequest messageRequest = ChatMessageRequest.builder()
                .studioId(String.valueOf(studioId))
                .platform(request.getPlatform())
                .messageType(request.getMessageType())
                .senderName(request.getSenderName())
                .senderProfileUrl(request.getSenderProfileUrl())
                .content(request.getContent())
                .build();

        chatService.sendMessage(odUserId, studioId, messageRequest);

        log.debug("WebSocket message received: studioId={}, sender={}",
                studioId, request.getSenderName());
    }

    @MessageMapping("/chat/{studioId}/typing")
    public void handleTyping(
            @DestinationVariable String studioId,
            @Payload TypingNotification notification,
            SimpMessageHeaderAccessor headerAccessor) {

        // 타이핑 알림은 별도 처리 (필요시 구현)
        log.debug("Typing notification: studioId={}, user={}", studioId, notification.getSenderName());
    }

    private String extractOdUserId(SimpMessageHeaderAccessor headerAccessor) {
        // 세션 속성에서 odUserId 추출 시도
        Object odUserId = headerAccessor.getSessionAttributes().get("odUserId");
        if (odUserId != null) {
            return odUserId.toString();
        }

        // 헤더에서 추출 시도
        String odUserIdHeader = headerAccessor.getFirstNativeHeader("X-Od-User-Id");
        if (odUserIdHeader != null) {
            return odUserIdHeader;
        }

        return null;
    }

    @lombok.Getter
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class TypingNotification {
        private String senderName;
        private boolean isTyping;
    }
}
