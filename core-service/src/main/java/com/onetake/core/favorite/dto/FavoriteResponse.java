package com.onetake.core.favorite.dto;

import com.onetake.core.favorite.entity.Favorite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteResponse {
    private String id;
    private String nickname;
    private String email;

    public static FavoriteResponse from(Favorite favorite) {
        return FavoriteResponse.builder()
                .id(favorite.getTarget().getUserId())
                .nickname(favorite.getTarget().getNickname())
                .email(favorite.getTarget().getEmail())
                .build();
    }
}
