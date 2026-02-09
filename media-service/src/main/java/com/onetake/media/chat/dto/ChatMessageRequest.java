package com.onetake.media.chat.dto;

import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageRequest {

    @NotBlank(message = "스튜디오 ID는 필수입니다")
    private String studioId;

    @Builder.Default
    private ChatPlatform platform = ChatPlatform.INTERNAL;

    @Builder.Default
    private MessageType messageType = MessageType.CHAT;

    @NotBlank(message = "발신자 이름은 필수입니다")
    @Size(max = 100, message = "발신자 이름은 100자 이하여야 합니다")
    private String senderName;

    private String senderProfileUrl;

    @NotBlank(message = "메시지 내용은 필수입니다")
    @Size(max = 2000, message = "메시지는 2000자 이하여야 합니다")
    private String content;

    private String externalMessageId;

    private Integer donationAmount;

    private String donationCurrency;
}
