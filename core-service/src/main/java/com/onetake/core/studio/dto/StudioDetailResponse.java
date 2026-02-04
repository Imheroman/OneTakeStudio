package com.onetake.core.studio.dto;

import com.onetake.core.studio.entity.Studio;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudioDetailResponse {

    private String studioId;
    /** 현재 요청 사용자의 스튜디오 내 역할 (HOST, MANAGER, GUEST) */
    private String myRole;
    private String name;
    private String description;
    private String thumbnail;
    private String template;
    private String status;
    private String recordingStorage; // LOCAL 또는 CLOUD
    private String joinUrl;
    private List<StudioMemberResponse> members;
    private List<SceneResponse> scenes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static StudioDetailResponse from(Studio studio, List<StudioMemberResponse> members, List<SceneResponse> scenes, String myRole) {
        return StudioDetailResponse.builder()
                .studioId(studio.getStudioId())
                .myRole(myRole != null ? myRole : "MANAGER")
                .name(studio.getName())
                .description(studio.getDescription())
                .thumbnail(studio.getThumbnail())
                .template(studio.getTemplate())
                .status(studio.getStatus().name().toLowerCase())
                .recordingStorage(studio.getRecordingStorage() != null ? studio.getRecordingStorage().name() : "LOCAL")
                .joinUrl("https://studio.example.com/join/" + studio.getStudioId())
                .members(members)
                .scenes(scenes)
                .createdAt(studio.getCreatedAt())
                .updatedAt(studio.getUpdatedAt())
                .build();
    }

    public static StudioDetailResponse from(Studio studio) {
        return StudioDetailResponse.builder()
                .studioId(studio.getStudioId())
                .myRole(null)
                .name(studio.getName())
                .description(studio.getDescription())
                .thumbnail(studio.getThumbnail())
                .template(studio.getTemplate())
                .status(studio.getStatus().name().toLowerCase())
                .recordingStorage(studio.getRecordingStorage() != null ? studio.getRecordingStorage().name() : "LOCAL")
                .joinUrl("https://studio.example.com/join/" + studio.getStudioId())
                .createdAt(studio.getCreatedAt())
                .updatedAt(studio.getUpdatedAt())
                .build();
    }
}
