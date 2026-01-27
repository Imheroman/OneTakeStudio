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

    private Long studioId;
    private String name;
    private String thumbnail;
    private String template;
    private String status;
    private String joinUrl;
    private List<StudioMemberResponse> members;
    private List<SceneResponse> scenes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static StudioDetailResponse from(Studio studio, List<StudioMemberResponse> members, List<SceneResponse> scenes) {
        return StudioDetailResponse.builder()
                .studioId(studio.getId())
                .name(studio.getName())
                .thumbnail(studio.getThumbnail())
                .template(studio.getTemplate())
                .status(studio.getStatus().name().toLowerCase())
                .joinUrl("https://studio.example.com/join/" + studio.getStudioId())
                .members(members)
                .scenes(scenes)
                .createdAt(studio.getCreatedAt())
                .updatedAt(studio.getUpdatedAt())
                .build();
    }

    public static StudioDetailResponse from(Studio studio) {
        return StudioDetailResponse.builder()
                .studioId(studio.getId())
                .name(studio.getName())
                .thumbnail(studio.getThumbnail())
                .template(studio.getTemplate())
                .status(studio.getStatus().name().toLowerCase())
                .joinUrl("https://studio.example.com/join/" + studio.getStudioId())
                .createdAt(studio.getCreatedAt())
                .updatedAt(studio.getUpdatedAt())
                .build();
    }
}
