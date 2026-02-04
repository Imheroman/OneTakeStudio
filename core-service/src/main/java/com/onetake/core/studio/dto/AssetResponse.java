package com.onetake.core.studio.dto;

import com.onetake.core.studio.entity.StudioAsset;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetResponse {

    private Long id;
    private String studioId;
    private String type;
    private String name;
    private String fileUrl;
    private LocalDateTime createdAt;

    public static AssetResponse from(StudioAsset asset, String studioUuid) {
        return AssetResponse.builder()
                .id(asset.getId())
                .studioId(studioUuid)
                .type(asset.getType().name().toLowerCase())
                .name(asset.getName())
                .fileUrl(asset.getFileUrl())
                .createdAt(asset.getCreatedAt())
                .build();
    }
}
