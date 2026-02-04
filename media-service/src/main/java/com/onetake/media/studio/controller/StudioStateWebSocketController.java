package com.onetake.media.studio.controller;

import com.onetake.media.studio.dto.StudioStateMessage;
import com.onetake.media.studio.service.StudioPresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

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
    private final StudioPresenceService presenceService;

    /**
     * 스튜디오 상태 변경 브로드캐스트
     * 프론트에서 /app/studio/{studioId}/state로 전송 시 호출
     */
    @MessageMapping("/studio/{studioId}/state")
    public void broadcastState(
            @DestinationVariable String studioId,
            @Payload StudioStateMessage message,
            SimpMessageHeaderAccessor headerAccessor) {

        // 타임스탬프 설정
        StudioStateMessage broadcastMessage = StudioStateMessage.builder()
                .type(message.getType())
                .studioId(studioId)
                .userId(message.getUserId())
                .nickname(message.getNickname())
                .payload(message.getPayload())
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
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
            @DestinationVariable String studioId,
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
     * MEMBER_JOINED: 접속자 목록에 추가 + 현재 접속자 목록 전송
     * MEMBER_LEFT: 접속자 목록에서 제거
     */
    @MessageMapping("/studio/{studioId}/presence")
    public void broadcastPresence(
            @DestinationVariable String studioId,
            @Payload StudioStateMessage message) {

        log.debug("멤버 프레즌스 수신: studioId={}, type={}, user={}",
                studioId, message.getType(), message.getNickname());

        if (message.getType() == StudioStateMessage.StudioStateType.MEMBER_JOINED) {
            // 접속자 목록 관리 + 브로드캐스트 + 현재 목록 전송
            presenceService.memberJoined(studioId, message.getUserId(), message.getNickname());
        } else if (message.getType() == StudioStateMessage.StudioStateType.MEMBER_LEFT) {
            // 접속자 목록에서 제거 + 브로드캐스트
            presenceService.memberLeft(studioId, message.getUserId(), message.getNickname());
        } else {
            // 기타 프레즌스 메시지는 그대로 브로드캐스트
            messagingTemplate.convertAndSend(
                    "/topic/studio/" + studioId + "/presence",
                    message
            );
        }
    }
}
