package com.onetake.core.workspace.dto;

import com.onetake.core.studio.entity.Studio;
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

    public static RecentStudioResponse from(Studio studio) {
        return RecentStudioResponse.builder()
                .id(studio.getId())
                .title(studio.getTitle())
                .date(studio.getCreatedAt().format(DATE_FORMAT))
                .build();
    }
}
