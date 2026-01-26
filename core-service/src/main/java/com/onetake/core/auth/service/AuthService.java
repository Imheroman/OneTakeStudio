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

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailVerificationService emailVerificationService;

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$"
    );

    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw AuthException.duplicateEmail();
        }

        if (userRepository.existsByNickname(request.getNickname())) {
            throw AuthException.duplicateNickname();
        }

        if (!emailVerificationService.isEmailVerified(request.getEmail())) {
            throw AuthException.verificationNotCompleted();
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .emailVerified(true)
                .build();

        userRepository.save(user);

        emailVerificationService.deleteVerification(request.getEmail());
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(AuthException::invalidCredentials);

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw AuthException.invalidCredentials();
        }

        if (!user.isEmailVerified()) {
            throw AuthException.emailNotVerified();
        }

        String accessToken = jwtUtil.generateAccessToken(
                user.getUserId(),
                user.getEmail(),
                user.getNickname()
        );
        String refreshToken = jwtUtil.generateRefreshToken(user.getUserId());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(LoginResponse.UserDto.builder()
                        .userId(user.getUserId())
                        .email(user.getEmail())
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
                user.getEmail(),
                user.getNickname()
        );
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getUserId());

        return TokenRefreshResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .build();
    }

    @Transactional(readOnly = true)
    public CheckEmailResponse checkEmailAvailable(String email) {
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
            return CheckEmailResponse.invalidFormat();
        }
        if (userRepository.existsByEmail(email)) {
            return CheckEmailResponse.duplicated();
        }
        return CheckEmailResponse.available();
    }
}
