package com.onetake.core.workspace.dto;

import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.entity.StudioMemberRole;
import lombok.Builder;
import lombok.Getter;

import java.time.format.DateTimeFormatter;

@Getter
@Builder
public class RecentStudioResponse {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private Long id;
    private String title;
    private String date;
    private String role;  // HOST, MANAGER, GUEST

    public static RecentStudioResponse from(Studio studio, StudioMemberRole role) {
        return RecentStudioResponse.builder()
                .id(studio.getId())
                .title(studio.getName())
                .date(studio.getCreatedAt().format(DATE_FORMAT))
                .role(role.name())
                .build();
    }
}
