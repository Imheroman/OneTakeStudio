package com.onetake.media.chat.service;

import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.dto.ChatMessageResponse;
import com.onetake.media.chat.dto.ChatStatsResponse;
import com.onetake.media.chat.entity.ChatMessage;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.repository.ChatMessageRepository;
import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import com.onetake.media.marker.service.ChatHighlightDetector;
import com.onetake.media.recording.entity.RecordingSession;
import com.onetake.media.recording.entity.RecordingStatus;
import com.onetake.media.recording.repository.RecordingSessionRepository;
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
    private final ChatHighlightDetector chatHighlightDetector;
    private final RecordingSessionRepository recordingSessionRepository;

    private static final String CHAT_TOPIC = "/topic/chat/";

    @Transactional
    public ChatMessageResponse sendMessage(Long userId, ChatMessageRequest request) {
        // 외부 메시지 중복 체크
        if (request.getExternalMessageId() != null &&
                chatMessageRepository.existsByExternalMessageId(request.getExternalMessageId())) {
            log.debug("Duplicate external message ignored: {}", request.getExternalMessageId());
            return null;
        }

        ChatMessage message = ChatMessage.builder()
                .studioId(request.getStudioId())
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

        // 채팅 급증 감지를 위해 메시지 기록 (녹화 중인 경우)
        notifyChatHighlightDetector(request.getStudioId());

        // WebSocket으로 브로드캐스트
        broadcastMessage(request.getStudioId(), response);

        log.info("Chat message sent: studioId={}, platform={}, sender={}",
                request.getStudioId(), request.getPlatform(), request.getSenderName());

        return response;
    }

    /**
     * 채팅 급증 감지기에 메시지 알림 (녹화 중인 경우만)
     */
    private void notifyChatHighlightDetector(Long studioId) {
        try {
            // 현재 녹화 중인 세션이 있는지 확인
            recordingSessionRepository.findByStudioIdAndStatus(studioId, RecordingStatus.RECORDING)
                    .ifPresent(session -> {
                        chatHighlightDetector.onChatMessage(studioId, session.getRecordingId());
                    });
        } catch (Exception e) {
            // 하이라이트 감지 실패가 채팅 메시지 전송을 막으면 안됨
            log.debug("채팅 하이라이트 감지기 알림 실패: {}", e.getMessage());
        }
    }

    @Transactional
    public ChatMessageResponse receiveExternalMessage(ChatMessageRequest request) {
        // 외부 플랫폼(YouTube, Twitch 등)에서 수신한 메시지 처리
        return sendMessage(null, request);
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
                .studioId(studioId)
                .platform(ChatPlatform.INTERNAL)
                .messageType(com.onetake.media.chat.entity.MessageType.SYSTEM)
                .senderName("System")
                .content(content)
                .build();

        sendMessage(null, request);
    }
}
