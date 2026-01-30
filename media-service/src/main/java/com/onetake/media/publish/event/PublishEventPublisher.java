package com.onetake.media.publish.event;

import com.onetake.media.publish.entity.PublishStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 송출 상태 변경 이벤트를 WebSocket으로 전파
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PublishEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 송출 시작 이벤트
     */
    public void publishStarted(Long studioId, String publishSessionId) {
        sendEvent(studioId, PublishEventType.PUBLISH_STARTED, publishSessionId, null);
    }

    /**
     * 송출 종료 이벤트 (정상 종료)
     */
    public void publishStopped(Long studioId, String publishSessionId) {
        sendEvent(studioId, PublishEventType.PUBLISH_STOPPED, publishSessionId, null);
    }

    /**
     * 송출 실패 이벤트 (에러 발생)
     */
    public void publishFailed(Long studioId, String publishSessionId, String errorMessage) {
        sendEvent(studioId, PublishEventType.PUBLISH_FAILED, publishSessionId, errorMessage);
    }

    /**
     * 외부 종료 이벤트 (YouTube에서 스트림 종료 등)
     */
    public void publishEndedExternally(Long studioId, String publishSessionId, String reason) {
        sendEvent(studioId, PublishEventType.PUBLISH_ENDED_EXTERNALLY, publishSessionId, reason);
    }

    private void sendEvent(Long studioId, PublishEventType eventType, String publishSessionId, String message) {
        Map<String, Object> event = new HashMap<>();
        event.put("type", eventType.name());
        event.put("studioId", studioId);
        event.put("publishSessionId", publishSessionId);
        event.put("message", message);
        event.put("timestamp", LocalDateTime.now().toString());

        // 스튜디오별 토픽으로 전송: /topic/studio/{studioId}/publish
        String destination = "/topic/studio/" + studioId + "/publish";
        messagingTemplate.convertAndSend(destination, event);

        log.info("Publish event sent: type={}, studioId={}, destination={}",
                eventType, studioId, destination);
    }

    public enum PublishEventType {
        PUBLISH_STARTED,           // 송출 시작
        PUBLISH_STOPPED,           // 정상 종료
        PUBLISH_FAILED,            // 송출 실패
        PUBLISH_ENDED_EXTERNALLY   // 외부에서 종료 (YouTube 등)
    }
}
