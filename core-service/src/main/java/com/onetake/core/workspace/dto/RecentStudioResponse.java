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
    private String title;
    private StudioStatus status;
    private String thumbnailUrl;
    private LocalDateTime scheduledAt;
    private LocalDateTime createdAt;
    private long memberCount;

    public static RecentStudioResponse from(Studio studio, long memberCount) {
        return RecentStudioResponse.builder()
                .studioId(studio.getStudioId())
                .title(studio.getTitle())
                .status(studio.getStatus())
                .thumbnailUrl(studio.getThumbnailUrl())
                .scheduledAt(studio.getScheduledAt())
                .createdAt(studio.getCreatedAt())
                .memberCount(memberCount)
                .build();
    }
}
