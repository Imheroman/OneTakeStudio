package com.onetake.core.studio.dto;

import com.onetake.core.studio.entity.MemberInvite;
import com.onetake.core.studio.entity.Studio;
import com.onetake.core.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceivedInviteResponse {

    private String inviteId;
    private Long studioId;
    private String studioName;
    private String studioThumbnail;
    private String inviterNickname;
    private String inviterEmail;
    private String role;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;

    public static ReceivedInviteResponse from(MemberInvite invite, Studio studio, User inviter) {
        return ReceivedInviteResponse.builder()
                .inviteId(invite.getInviteId())
                .studioId(studio.getId())
                .studioName(studio.getName())
                .studioThumbnail(studio.getThumbnail())
                .inviterNickname(inviter != null ? inviter.getNickname() : null)
                .inviterEmail(inviter != null ? inviter.getEmail() : null)
                .role(invite.getRole().name().toLowerCase())
                .expiresAt(invite.getExpiresAt())
                .createdAt(invite.getCreatedAt())
                .build();
    }
}
