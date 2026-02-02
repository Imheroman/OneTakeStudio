package com.onetake.core.favorite.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddFavoriteResponse {
    private String message;
    private FavoriteResponse favorite;

    public static AddFavoriteResponse of(String message, FavoriteResponse favorite) {
        return AddFavoriteResponse.builder()
                .message(message)
                .favorite(favorite)
                .build();
    }
}
