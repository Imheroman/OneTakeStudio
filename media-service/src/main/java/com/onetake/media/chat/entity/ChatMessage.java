package com.onetake.media.chat.entity;

import com.onetake.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_studio_id", columnList = "studio_id"),
        @Index(name = "idx_studio_created", columnList = "studio_id, created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ChatMessage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", unique = true, nullable = false, updatable = false, length = 36)
    private String messageId;

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false, length = 20)
    private ChatPlatform platform;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    @Builder.Default
    private MessageType messageType = MessageType.CHAT;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "sender_name", nullable = false, length = 100)
    private String senderName;

    @Column(name = "sender_profile_url")
    private String senderProfileUrl;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "external_message_id")
    private String externalMessageId;

    @Column(name = "donation_amount")
    private Integer donationAmount;

    @Column(name = "donation_currency", length = 10)
    private String donationCurrency;

    @Column(name = "is_highlighted")
    @Builder.Default
    private Boolean isHighlighted = false;

    @Column(name = "is_deleted")
    @Builder.Default
    private Boolean isDeleted = false;

    public void highlight() {
        this.isHighlighted = true;
    }

    public void delete() {
        this.isDeleted = true;
    }

    @PrePersist
    public void prePersist() {
        if (this.messageId == null) {
            this.messageId = UUID.randomUUID().toString();
        }
    }
}
