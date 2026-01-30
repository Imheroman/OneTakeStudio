package com.onetake.core.user.service;

import com.onetake.core.user.dto.UpdateProfileRequest;
import com.onetake.core.user.dto.UserProfileResponse;
import com.onetake.core.user.dto.UserSearchResponse;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.exception.UserNotFoundException;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
        return UserProfileResponse.from(user);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
        return UserProfileResponse.from(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(String userId, UpdateProfileRequest request) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));

        if (request.getNickname() != null) {
            user.updateNickname(request.getNickname());
        }
        if (request.getProfileImageUrl() != null) {
            user.updateProfileImageUrl(request.getProfileImageUrl());
        }

        return UserProfileResponse.from(user);
    }

    /**
     * 이메일 또는 닉네임으로 사용자 검색
     * @param query 검색어
     * @param currentUserId 현재 로그인한 사용자 ID (검색 결과에서 제외)
     * @return 검색 결과
     */
    @Transactional(readOnly = true)
    public UserSearchResponse searchUsers(String query, String currentUserId) {
        if (query == null || query.trim().isEmpty()) {
            return UserSearchResponse.from(List.of());
        }

        List<User> users = userRepository.searchByEmailOrNickname(query.trim());

        // 현재 로그인한 사용자 제외
        List<User> filteredUsers = users.stream()
                .filter(user -> !user.getUserId().equals(currentUserId))
                .toList();

        return UserSearchResponse.from(filteredUsers);
    }
}
