package com.onetake.core.studio.dto;

import com.onetake.core.studio.entity.StudioBanner;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BannerResponse {

    private Long id;
    private String studioId;
    private String text;
    private Integer timerSeconds;
    private Boolean isTicker;
    private Integer sortOrder;
    private LocalDateTime createdAt;

    public static BannerResponse from(StudioBanner banner, String studioUuid) {
        return BannerResponse.builder()
                .id(banner.getId())
                .studioId(studioUuid)
                .text(banner.getText())
                .timerSeconds(banner.getTimerSeconds())
                .isTicker(banner.getIsTicker())
                .sortOrder(banner.getSortOrder())
                .createdAt(banner.getCreatedAt())
                .build();
    }
}
