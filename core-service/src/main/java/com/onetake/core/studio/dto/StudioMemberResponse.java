package com.onetake.core.studio.dto;

import com.onetake.core.studio.entity.StudioMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudioMemberResponse {

    private Long memberId;
    private Long userId;
    private String nickname;
    private String email;
    private String profileImageUrl;
    private String role;
    private LocalDateTime joinedAt;

    public static StudioMemberResponse from(StudioMember member, String nickname, String email, String profileImageUrl) {
        return StudioMemberResponse.builder()
                .memberId(member.getId())
                .userId(member.getUserId())
                .nickname(nickname)
                .email(email)
                .profileImageUrl(profileImageUrl)
                .role(member.getRole().name().toLowerCase())
                .joinedAt(member.getJoinedAt())
                .build();
    }

    public static StudioMemberResponse from(StudioMember member) {
        return StudioMemberResponse.builder()
                .memberId(member.getId())
                .userId(member.getUserId())
                .role(member.getRole().name().toLowerCase())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
