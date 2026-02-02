package com.onetake.media.studio.controller;

import com.onetake.media.studio.dto.StudioStateMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

/**
 * 스튜디오 상태 동기화 WebSocket 컨트롤러
 *
 * 프론트엔드에서 상태 변경 시:
 * - destination: /app/studio/{studioId}/state
 *
 * 다른 멤버들이 구독:
 * - destination: /topic/studio/{studioId}/state
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class StudioStateWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 스튜디오 상태 변경 브로드캐스트
     * 프론트에서 /app/studio/{studioId}/state로 전송 시 호출
     */
    @MessageMapping("/studio/{studioId}/state")
    public void broadcastState(
            @DestinationVariable Long studioId,
            @Payload StudioStateMessage message,
            SimpMessageHeaderAccessor headerAccessor) {

        // 타임스탬프 설정
        StudioStateMessage broadcastMessage = StudioStateMessage.builder()
                .type(message.getType())
                .studioId(studioId)
                .userId(message.getUserId())
                .nickname(message.getNickname())
                .payload(message.getPayload())
                .timestamp(LocalDateTime.now())
                .build();

        log.debug("스튜디오 상태 브로드캐스트: studioId={}, type={}, user={}",
                studioId, message.getType(), message.getNickname());

        // 해당 스튜디오를 구독 중인 모든 클라이언트에게 브로드캐스트
        messagingTemplate.convertAndSend(
                "/topic/studio/" + studioId + "/state",
                broadcastMessage
        );
    }

    /**
     * 편집 락 상태 브로드캐스트
     * Core Service에서 락 변경 시 호출 (REST API → 이 메서드 호출)
     */
    @MessageMapping("/studio/{studioId}/lock")
    public void broadcastLockStatus(
            @DestinationVariable Long studioId,
            @Payload StudioStateMessage message) {

        log.debug("편집 락 상태 브로드캐스트: studioId={}, type={}, user={}",
                studioId, message.getType(), message.getNickname());

        messagingTemplate.convertAndSend(
                "/topic/studio/" + studioId + "/lock",
                message
        );
    }

    /**
     * 멤버 입장/퇴장 알림
     */
    @MessageMapping("/studio/{studioId}/presence")
    public void broadcastPresence(
            @DestinationVariable Long studioId,
            @Payload StudioStateMessage message) {

        log.debug("멤버 프레즌스 브로드캐스트: studioId={}, type={}, user={}",
                studioId, message.getType(), message.getNickname());

        messagingTemplate.convertAndSend(
                "/topic/studio/" + studioId + "/presence",
                message
        );
    }
}
