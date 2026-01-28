package com.onetake.core.studio.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "member_invites")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MemberInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invite_id", unique = true, nullable = false, length = 20)
    private String inviteId;

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Column(name = "inviter_id", nullable = false)
    private Long inviterId;

    @Column(name = "invitee_email", nullable = false)
    private String inviteeEmail;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private StudioMemberRole role;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private InviteStatus status = InviteStatus.PENDING;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (inviteId == null) {
            inviteId = "inv-" + UUID.randomUUID().toString().substring(0, 6);
        }
    }

    public boolean isValid() {
        return status == InviteStatus.PENDING && expiresAt.isAfter(LocalDateTime.now());
    }

    public void accept() {
        this.status = InviteStatus.ACCEPTED;
    }

    public void reject() {
        this.status = InviteStatus.REJECTED;
    }

    public void expire() {
        this.status = InviteStatus.EXPIRED;
    }
}
