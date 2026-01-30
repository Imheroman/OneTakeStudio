package com.onetake.media.chat.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MessageType {
    CHAT("일반 채팅"),
    SUPER_CHAT("슈퍼챗/후원"),
    SYSTEM("시스템 메시지"),
    JOIN("입장 알림"),
    LEAVE("퇴장 알림"),
    NOTICE("공지");

    private final String description;
}
