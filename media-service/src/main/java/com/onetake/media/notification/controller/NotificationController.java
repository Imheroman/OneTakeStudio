package com.onetake.media.notification.controller;

import com.onetake.media.notification.dto.NotificationResponse;
import com.onetake.media.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

/**
 * 알림 API
 */
@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * SSE 연결 (실시간 알림 스트림)
     *
     * GET /api/notifications/subscribe
     *
     * 프론트엔드에서:
     * const eventSource = new EventSource('/api/notifications/subscribe', {
     *   headers: { 'X-User-Id': userId }
     * });
     * eventSource.addEventListener('notification', (event) => {
     *   const notification = JSON.parse(event.data);
     *   console.log('새 알림:', notification);
     * });
     */
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@RequestHeader("X-User-Id") String userId) {
        log.info("SSE 구독 요청: userId={}", userId);
        return notificationService.subscribe(userId);
    }

    /**
     * 알림 목록 조회
     *
     * GET /api/notifications
     */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @RequestHeader("X-User-Id") String userId) {

        List<NotificationResponse> notifications = notificationService.getNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * 읽지 않은 알림 개수
     *
     * GET /api/notifications/unread-count
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @RequestHeader("X-User-Id") String userId) {

        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * 알림 읽음 처리
     *
     * PUT /api/notifications/{id}/read
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") String userId) {

        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * 모든 알림 읽음 처리
     *
     * PUT /api/notifications/read-all
     */
    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Integer>> markAllAsRead(
            @RequestHeader("X-User-Id") String userId) {

        int count = notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }
}
