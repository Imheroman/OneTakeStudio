package com.onetake.media.studio.service;

import com.onetake.media.studio.dto.StudioStateMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * 스튜디오 상태 동기화 서비스
 * WebSocket을 통한 실시간 상태 브로드캐스트
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudioStateService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 상태 변경 브로드캐스트
     */
    public void broadcastState(String studioId, StudioStateMessage message) {
        String destination = "/topic/studio/" + studioId + "/state";

        log.debug("상태 브로드캐스트: studioId={}, type={}, destination={}",
                studioId, message.getType(), destination);

        messagingTemplate.convertAndSend(destination, message);
    }

    /**
     * 편집 락 상태 브로드캐스트
     */
    public void broadcastLockAcquired(String studioId, String userId, String nickname) {
        StudioStateMessage message = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.LOCK_ACQUIRED)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        messagingTemplate.convertAndSend("/topic/studio/" + studioId + "/lock", message);
        log.info("편집 락 획득 브로드캐스트: studioId={}, user={}", studioId, nickname);
    }

    /**
     * 편집 락 해제 브로드캐스트
     */
    public void broadcastLockReleased(String studioId, String userId, String nickname) {
        StudioStateMessage message = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.LOCK_RELEASED)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        messagingTemplate.convertAndSend("/topic/studio/" + studioId + "/lock", message);
        log.info("편집 락 해제 브로드캐스트: studioId={}, user={}", studioId, nickname);
    }

    /**
     * 레이아웃 변경 브로드캐스트
     */
    public void broadcastLayoutChange(String studioId, String userId, String nickname, String layout) {
        StudioStateMessage message = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.LAYOUT_CHANGE)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .payload(Map.of("layout", layout))
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        broadcastState(studioId, message);
    }

    /**
     * 소스 변환(위치/크기) 브로드캐스트
     */
    public void broadcastSourceTransform(String studioId, String userId, String nickname,
                                          String sourceId, Map<String, Object> transform) {
        StudioStateMessage message = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.SOURCE_TRANSFORM)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .payload(Map.of("sourceId", sourceId, "transform", transform))
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        broadcastState(studioId, message);
    }

    /**
     * 배너 선택 브로드캐스트
     */
    public void broadcastBannerSelected(String studioId, String userId, String nickname, Object banner) {
        StudioStateMessage message = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.BANNER_SELECTED)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .payload(Map.of("banner", banner != null ? banner : "null"))
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        broadcastState(studioId, message);
    }

    /**
     * 에셋 선택 브로드캐스트
     */
    public void broadcastAssetSelected(String studioId, String userId, String nickname, Object asset) {
        StudioStateMessage message = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.ASSET_SELECTED)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .payload(Map.of("asset", asset != null ? asset : "null"))
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        broadcastState(studioId, message);
    }

    /**
     * 멤버 입장 브로드캐스트
     */
    public void broadcastMemberJoined(String studioId, String userId, String nickname) {
        StudioStateMessage message = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.MEMBER_JOINED)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        messagingTemplate.convertAndSend("/topic/studio/" + studioId + "/presence", message);
        log.info("멤버 입장 브로드캐스트: studioId={}, user={}", studioId, nickname);
    }

    /**
     * 멤버 퇴장 브로드캐스트
     */
    public void broadcastMemberLeft(String studioId, String userId, String nickname) {
        StudioStateMessage message = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.MEMBER_LEFT)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        messagingTemplate.convertAndSend("/topic/studio/" + studioId + "/presence", message);
        log.info("멤버 퇴장 브로드캐스트: studioId={}, user={}", studioId, nickname);
    }
}
