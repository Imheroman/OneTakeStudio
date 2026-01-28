package com.onetake.core.notification.controller;

import com.onetake.core.notification.dto.NotificationListResponse;
import com.onetake.core.notification.dto.NotificationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @GetMapping
    public ResponseEntity<NotificationListResponse> getNotifications() {
        return ResponseEntity.ok(new NotificationListResponse(Collections.emptyList()));
    }
}
