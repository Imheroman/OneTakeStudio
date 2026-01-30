package com.onetake.media.chat.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ChatPlatform {
    INTERNAL("OneTake", "내부 채팅"),
    YOUTUBE("YouTube", "유튜브 라이브 채팅"),
    TWITCH("Twitch", "트위치 IRC 채팅"),
    CHZZK("Chzzk", "치지직 채팅");

    private final String displayName;
    private final String description;
}
