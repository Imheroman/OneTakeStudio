package com.onetake.core.notification.controller;

import com.onetake.core.notification.dto.NotificationListResponse;
import com.onetake.core.notification.service.NotificationService;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<NotificationListResponse> getNotifications(
            @CurrentUser CustomUserDetails userDetails) {
        NotificationListResponse response = notificationService.getNotifications(userDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String notificationId) {
        notificationService.markAsRead(userDetails.getUserId(), notificationId);
        return ResponseEntity.ok(Map.of("message", "알림을 읽음 처리했습니다."));
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Map<String, String>> deleteNotification(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String notificationId) {
        notificationService.deleteNotification(userDetails.getUserId(), notificationId);
        return ResponseEntity.ok(Map.of("message", "알림을 삭제했습니다."));
    }

    @DeleteMapping
    public ResponseEntity<Map<String, String>> deleteAllNotifications(
            @CurrentUser CustomUserDetails userDetails) {
        notificationService.deleteAllNotifications(userDetails.getUserId());
        return ResponseEntity.ok(Map.of("message", "모든 알림을 삭제했습니다."));
    }
}
