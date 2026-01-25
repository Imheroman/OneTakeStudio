package com.onetake.core.auth.service;

import com.onetake.common.jwt.JwtUtil;
import com.onetake.core.auth.dto.*;
import com.onetake.core.auth.exception.AuthException;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw AuthException.duplicateUsername();
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .build();

        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(AuthException::invalidCredentials);

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw AuthException.invalidCredentials();
        }

        String accessToken = jwtUtil.generateAccessToken(
                user.getUserId(),
                user.getUsername(),
                user.getNickname()
        );
        String refreshToken = jwtUtil.generateRefreshToken(user.getUserId());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(LoginResponse.UserDto.builder()
                        .userId(user.getUserId())
                        .username(user.getUsername())
                        .nickname(user.getNickname())
                        .profileImageUrl(user.getProfileImageUrl())
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public TokenRefreshResponse refreshToken(TokenRefreshRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtUtil.validateToken(refreshToken)) {
            throw AuthException.invalidToken();
        }

        if (!jwtUtil.isRefreshToken(refreshToken)) {
            throw AuthException.invalidToken();
        }

        Long userId = jwtUtil.getUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(AuthException::userNotFound);

        String newAccessToken = jwtUtil.generateAccessToken(
                user.getUserId(),
                user.getUsername(),
                user.getNickname()
        );
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getUserId());

        return TokenRefreshResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .build();
    }

    @Transactional(readOnly = true)
    public boolean checkUsernameAvailable(String username) {
        return !userRepository.existsByUsername(username);
    }
}
