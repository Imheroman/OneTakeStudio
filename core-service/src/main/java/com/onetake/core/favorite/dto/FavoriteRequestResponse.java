package com.onetake.core.favorite.dto;

import com.onetake.core.favorite.entity.FavoriteRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteRequestResponse {
    private String requestId;
    private String requesterId;
    private String requesterNickname;
    private String requesterEmail;
    private String status;
    private LocalDateTime createdAt;

    public static FavoriteRequestResponse from(FavoriteRequest request) {
        return FavoriteRequestResponse.builder()
                .requestId(request.getRequestId())
                .requesterId(request.getRequester().getUserId())
                .requesterNickname(request.getRequester().getNickname())
                .requesterEmail(request.getRequester().getEmail())
                .status(request.getStatus().name())
                .createdAt(request.getCreatedAt())
                .build();
    }
}
