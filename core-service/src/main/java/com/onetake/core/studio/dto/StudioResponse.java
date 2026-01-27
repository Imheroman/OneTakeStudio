package com.onetake.core.studio.dto;

import com.onetake.core.studio.entity.Studio;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudioResponse {

    private Long studioId;
    private String name;
    private String thumbnail;
    private String status;
    private LocalDateTime createdAt;

    public static StudioResponse from(Studio studio) {
        return StudioResponse.builder()
                .studioId(studio.getId())
                .name(studio.getName())
                .thumbnail(studio.getThumbnail())
                .status(studio.getStatus().name().toLowerCase())
                .createdAt(studio.getCreatedAt())
                .build();
    }
}
