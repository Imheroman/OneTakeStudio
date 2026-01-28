package com.onetake.core.studio.dto;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.core.studio.entity.Scene;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SceneResponse {

    private Long sceneId;
    private String name;
    private String thumbnail;
    private Boolean isActive;
    private Integer sortOrder;
    private SceneLayoutDto layout;
    private LocalDateTime createdAt;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static SceneResponse from(Scene scene) {
        SceneLayoutDto layoutDto = null;
        if (scene.getLayout() != null) {
            try {
                layoutDto = objectMapper.readValue(scene.getLayout(), SceneLayoutDto.class);
            } catch (JsonProcessingException e) {
                layoutDto = null;
            }
        }

        return SceneResponse.builder()
                .sceneId(scene.getId())
                .name(scene.getName())
                .thumbnail(scene.getThumbnail())
                .isActive(scene.getIsActive())
                .sortOrder(scene.getSortOrder())
                .layout(layoutDto)
                .createdAt(scene.getCreatedAt())
                .build();
    }
}
