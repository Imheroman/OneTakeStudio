package com.onetake.media.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Map;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatStatsResponse {

    private String studioId;
    private Long totalMessages;
    private Long messagesLastMinute;
    private Map<String, Long> messagesByPlatform;
}
