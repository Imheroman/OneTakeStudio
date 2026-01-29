package com.onetake.core.user.dto;

import com.onetake.core.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchResponse {

    private List<UserSearchResult> users;

    public static UserSearchResponse from(List<User> users) {
        List<UserSearchResult> results = users.stream()
                .map(UserSearchResult::from)
                .toList();
        return new UserSearchResponse(results);
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSearchResult {
        private String id;
        private String nickname;
        private String email;

        public static UserSearchResult from(User user) {
            return UserSearchResult.builder()
                    .id(user.getUserId())
                    .nickname(user.getNickname())
                    .email(user.getEmail())
                    .build();
        }
    }
}
