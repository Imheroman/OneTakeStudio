package com.onetake.core.favorite.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteListResponse {
    private List<FavoriteResponse> favorites;
    private int total;
    private int maxCount;

    public static FavoriteListResponse of(List<FavoriteResponse> favorites, int maxCount) {
        return FavoriteListResponse.builder()
                .favorites(favorites)
                .total(favorites.size())
                .maxCount(maxCount)
                .build();
    }
}
