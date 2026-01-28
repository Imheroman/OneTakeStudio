package com.onetake.core.workspace.dto;

import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.entity.StudioStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RecentStudioResponse {

    private String studioId;
    private String name;
    private StudioStatus status;
    private String thumbnail;
    private LocalDateTime createdAt;
    private long memberCount;

    public static RecentStudioResponse from(Studio studio, long memberCount) {
        return RecentStudioResponse.builder()
                .studioId(studio.getStudioId())
                .name(studio.getName())
                .status(studio.getStatus())
                .thumbnail(studio.getThumbnail())
                .createdAt(studio.getCreatedAt())
                .memberCount(memberCount)
                .build();
    }
}
