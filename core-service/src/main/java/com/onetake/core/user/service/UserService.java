package com.onetake.core.user.service;

import com.onetake.core.user.dto.ChangePasswordRequest;
import com.onetake.core.user.dto.UpdateProfileRequest;
import com.onetake.core.user.dto.UserProfileResponse;
import com.onetake.core.user.dto.UserSearchResponse;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.exception.UserNotFoundException;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));

        if (user.getPassword() == null) {
            throw new IllegalArgumentException("소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("새 비밀번호가 일치하지 않습니다.");
        }

        user.updatePassword(passwordEncoder.encode(request.getNewPassword()));
    }
}
