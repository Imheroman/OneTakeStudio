package com.onetake.media.chat.service;

import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.dto.ChatMessageResponse;
import com.onetake.media.chat.dto.ChatStatsResponse;
import com.onetake.media.chat.entity.ChatMessage;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.repository.ChatMessageRepository;
import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final CommentCounterService commentCounterService;

    private static final String CHAT_TOPIC = "/topic/chat/";

    @Transactional
    public ChatMessageResponse sendMessage(Long userId, Long studioId, ChatMessageRequest request) {
        // 외부 메시지 중복 체크
        if (request.getExternalMessageId() != null &&
                chatMessageRepository.existsByExternalMessageId(request.getExternalMessageId())) {
            log.debug("Duplicate external message ignored: {}", request.getExternalMessageId());
            return null;
        }

        ChatMessage message = ChatMessage.builder()
                .studioId(studioId)
                .platform(request.getPlatform())
                .messageType(request.getMessageType())
                .userId(userId)
                .senderName(request.getSenderName())
                .senderProfileUrl(request.getSenderProfileUrl())
                .content(request.getContent())
                .externalMessageId(request.getExternalMessageId())
                .donationAmount(request.getDonationAmount())
                .donationCurrency(request.getDonationCurrency())
                .build();

        ChatMessage saved = chatMessageRepository.save(message);
        ChatMessageResponse response = ChatMessageResponse.from(saved);

        // WebSocket으로 브로드캐스트
        broadcastMessage(studioId, response);

        // 분당 댓글 수 카운터 증가 (AI 하이라이트 추출용)
        if (commentCounterService.isCountingActive(studioId)) {
            commentCounterService.incrementCount(studioId);
        }

        log.info("Chat message sent: studioId={}, platform={}, sender={}",
                studioId, request.getPlatform(), request.getSenderName());

        return response;
    }

    /**
     * 외부 플랫폼(YouTube, Chzzk 등)에서 수신한 메시지 처리
     * DB 저장 없이 WebSocket 브로드캐스트 + 분당 댓글 수 카운팅
     */
    public void receiveExternalMessage(Long studioId, ChatMessageRequest request) {
        ChatMessageResponse response = ChatMessageResponse.builder()
                .messageId(request.getExternalMessageId() != null
                        ? request.getExternalMessageId()
                        : java.util.UUID.randomUUID().toString())
                .studioId(studioId)
                .platform(request.getPlatform())
                .messageType(request.getMessageType())
                .senderName(request.getSenderName())
                .senderProfileUrl(request.getSenderProfileUrl())
                .content(request.getContent())
                .donationAmount(request.getDonationAmount())
                .donationCurrency(request.getDonationCurrency())
                .isHighlighted(false)
                .createdAt(LocalDateTime.now())
                .build();

        // WebSocket 브로드캐스트
        broadcastMessage(studioId, response);

        // 분당 댓글 수 카운팅 (AI 하이라이트 추출 기준)
        if (commentCounterService.isCountingActive(studioId)) {
            commentCounterService.incrementCount(studioId);
        }

        log.debug("External chat broadcasted: studioId={}, platform={}, sender={}",
                studioId, request.getPlatform(), request.getSenderName());
    }

    public List<ChatMessageResponse> getMessages(Long studioId, int limit) {
        Page<ChatMessage> messages = chatMessageRepository
                .findByStudioIdAndIsDeletedFalseOrderByCreatedAtDesc(
                        studioId, PageRequest.of(0, limit));

        return messages.getContent().stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    public List<ChatMessageResponse> getMessagesByPlatform(Long studioId, ChatPlatform platform) {
        return chatMessageRepository
                .findByStudioIdAndPlatformAndIsDeletedFalseOrderByCreatedAtDesc(studioId, platform)
                .stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    public List<ChatMessageResponse> getRecentMessages(Long studioId, int minutes) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(minutes);
        return chatMessageRepository.findRecentMessages(studioId, since)
                .stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    public List<ChatMessageResponse> getHighlightedMessages(Long studioId) {
        return chatMessageRepository.findHighlightedMessages(studioId)
                .stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    @Transactional
    public ChatMessageResponse highlightMessage(String messageId) {
        ChatMessage message = chatMessageRepository.findByMessageId(messageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        message.highlight();
        ChatMessage saved = chatMessageRepository.save(message);

        log.info("Message highlighted: messageId={}", messageId);
        return ChatMessageResponse.from(saved);
    }

    @Transactional
    public void deleteMessage(String messageId) {
        ChatMessage message = chatMessageRepository.findByMessageId(messageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        message.delete();
        chatMessageRepository.save(message);

        // 삭제 알림 브로드캐스트
        messagingTemplate.convertAndSend(
                CHAT_TOPIC + message.getStudioId() + "/delete",
                Map.of("messageId", messageId));

        log.info("Message deleted: messageId={}", messageId);
    }

    public ChatStatsResponse getChatStats(Long studioId) {
        LocalDateTime oneMinuteAgo = LocalDateTime.now().minusMinutes(1);

        Long totalMessages = chatMessageRepository.countMessagesSince(
                studioId, LocalDateTime.now().minusHours(24));
        Long messagesLastMinute = chatMessageRepository.countMessagesSince(studioId, oneMinuteAgo);

        List<Object[]> platformCounts = chatMessageRepository.countByPlatform(studioId);
        Map<String, Long> messagesByPlatform = new HashMap<>();
        for (Object[] row : platformCounts) {
            messagesByPlatform.put(((ChatPlatform) row[0]).name(), (Long) row[1]);
        }

        return ChatStatsResponse.builder()
                .studioId(studioId)
                .totalMessages(totalMessages)
                .messagesLastMinute(messagesLastMinute)
                .messagesByPlatform(messagesByPlatform)
                .build();
    }

    private void broadcastMessage(Long studioId, ChatMessageResponse message) {
        messagingTemplate.convertAndSend(CHAT_TOPIC + studioId, message);
    }

    @Transactional
    public void sendSystemMessage(Long studioId, String content) {
        ChatMessageRequest request = ChatMessageRequest.builder()
                .studioId(String.valueOf(studioId))
                .platform(ChatPlatform.INTERNAL)
                .messageType(com.onetake.media.chat.entity.MessageType.SYSTEM)
                .senderName("System")
                .content(content)
                .build();

        sendMessage(null, studioId, request);
    }
}
