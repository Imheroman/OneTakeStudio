package com.onetake.core.destination.dto;

import com.onetake.core.destination.entity.ConnectedDestination;
import lombok.Builder;
import lombok.Getter;

/**
 * 내부 서비스 간 통신용 Destination 응답 (토큰 포함)
 *
 * 주의: 이 DTO는 서비스 간 내부 통신에만 사용해야 합니다.
 * 절대 외부 API로 노출하지 마세요.
 */
@Getter
@Builder
public class DestinationInternalResponse {

    private Long id;
    private Long userId;
    private String platform;
    private String channelId;
    private String channelName;
    private String accessToken;
    private String refreshToken;
    private Boolean isActive;

    public static DestinationInternalResponse from(ConnectedDestination entity) {
        return DestinationInternalResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .platform(entity.getPlatform())
                .channelId(entity.getChannelId())
                .channelName(entity.getChannelName())
                .accessToken(entity.getAccessToken())
                .refreshToken(entity.getRefreshToken())
                .isActive(entity.getIsActive())
                .build();
    }
}
