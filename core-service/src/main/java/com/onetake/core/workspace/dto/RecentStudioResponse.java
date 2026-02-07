package com.onetake.core.workspace.dto;

import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.entity.StudioMemberRole;
import lombok.Builder;
import lombok.Getter;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Getter
@Builder
public class RecentStudioResponse {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private String id;
    private String title;
    private String date;
    private String role;  // HOST, MANAGER
    private String recordingStorage;  // LOCAL, CLOUD

    @JsonIgnore
    private LocalDateTime createdAt;

    public static RecentStudioResponse from(Studio studio, StudioMemberRole role) {
        return RecentStudioResponse.builder()
                .id(studio.getStudioId())
                .title(studio.getName())
                .date(studio.getCreatedAt().format(DATE_FORMAT))
                .role(role.name())
                .recordingStorage(studio.getRecordingStorage() != null ? studio.getRecordingStorage().name() : "LOCAL")
                .createdAt(studio.getCreatedAt())
                .build();
    }
}
