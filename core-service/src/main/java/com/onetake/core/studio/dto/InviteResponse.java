package com.onetake.core.studio.dto;

import com.onetake.core.studio.entity.MemberInvite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InviteResponse {

    private String inviteId;
    private String inviteeEmail;
    private String role;
    private String status;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;

    public static InviteResponse from(MemberInvite invite) {
        return InviteResponse.builder()
                .inviteId(invite.getInviteId())
                .inviteeEmail(invite.getInviteeEmail())
                .role(invite.getRole().name().toLowerCase())
                .status(invite.getStatus().name().toLowerCase())
                .expiresAt(invite.getExpiresAt())
                .createdAt(invite.getCreatedAt())
                .build();
    }
}
