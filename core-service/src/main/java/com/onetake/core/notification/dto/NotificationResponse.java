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
    private String time;
    private String createdAt;
    private Boolean read;
}
