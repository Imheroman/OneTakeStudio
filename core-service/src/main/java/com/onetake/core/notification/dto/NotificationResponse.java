package com.onetake.core.notification.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationResponse {

    private String id;
    private String type;
    private String title;
    private String message;
    private String referenceId;  // 초대 ID 등 참조 ID
    private String time;
    private String createdAt;
    private Boolean read;
}
