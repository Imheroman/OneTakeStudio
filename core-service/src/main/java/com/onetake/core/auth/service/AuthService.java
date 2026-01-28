package com.onetake.core.auth.service;

import com.onetake.common.jwt.JwtUtil;
import com.onetake.core.auth.dto.*;
import com.onetake.core.auth.entity.AuthProvider;
import com.onetake.core.auth.exception.AuthException;
import com.onetake.core.security.TokenBlacklistService;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Date;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailVerificationService emailVerificationService;
    private final OAuthService oAuthService;
    private final TokenBlacklistService tokenBlacklistService;

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
                user.getNickname(),
                user.getId()
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

        String userId = jwtUtil.getUserId(refreshToken);
        User user = userRepository.findByUserId(userId)
                .orElseThrow(AuthException::userNotFound);

        String newAccessToken = jwtUtil.generateAccessToken(
                user.getUserId(),
                user.getEmail(),
                user.getNickname(),
                user.getId()
        );
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getUserId());

        return TokenRefreshResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .build();
    }

    public void logout(String accessToken) {
        if (!jwtUtil.validateToken(accessToken) || !jwtUtil.isAccessToken(accessToken)) {
            throw AuthException.invalidToken();
        }

        String jti = jwtUtil.getJti(accessToken);
        if (jti == null) {
            return;
        }

        Date expiration = jwtUtil.getExpiration(accessToken);
        long remainingMs = expiration.getTime() - System.currentTimeMillis();
        if (remainingMs > 0) {
            tokenBlacklistService.blacklist(jti, Duration.ofMillis(remainingMs));
        }
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

    @Transactional
    public LoginResponse oauthLoginGoogle(OAuthLoginRequest request) {
        OAuthUserInfo userInfo = oAuthService.getGoogleUserInfo(request.getAccessToken());
        return processOAuthLogin(userInfo);
    }

    @Transactional
    public LoginResponse oauthLoginKakao(OAuthLoginRequest request) {
        OAuthUserInfo userInfo = oAuthService.getKakaoUserInfo(request.getAccessToken());
        return processOAuthLogin(userInfo);
    }

    @Transactional
    public LoginResponse oauthLoginNaver(OAuthLoginRequest request) {
        OAuthUserInfo userInfo = oAuthService.getNaverUserInfo(request.getAccessToken());
        return processOAuthLogin(userInfo);
    }

    // ==================== Code 기반 OAuth 로그인 (Authorization Code Flow) ====================

    @Transactional
    public LoginResponse oauthLoginGoogleWithCode(String code, String redirectUri) {
        String accessToken = oAuthService.exchangeGoogleCodeForToken(code, redirectUri);
        OAuthUserInfo userInfo = oAuthService.getGoogleUserInfo(accessToken);
        return processOAuthLogin(userInfo);
    }

    @Transactional
    public LoginResponse oauthLoginKakaoWithCode(String code, String redirectUri) {
        String accessToken = oAuthService.exchangeKakaoCodeForToken(code, redirectUri);
        OAuthUserInfo userInfo = oAuthService.getKakaoUserInfo(accessToken);
        return processOAuthLogin(userInfo);
    }

    @Transactional
    public LoginResponse oauthLoginNaverWithCode(String code, String redirectUri) {
        String accessToken = oAuthService.exchangeNaverCodeForToken(code, redirectUri);
        OAuthUserInfo userInfo = oAuthService.getNaverUserInfo(accessToken);
        return processOAuthLogin(userInfo);
    }

    private LoginResponse processOAuthLogin(OAuthUserInfo userInfo) {
        if (userInfo.getEmail() == null || userInfo.getEmail().isEmpty()) {
            throw AuthException.oauthEmailRequired();
        }

        Optional<User> existingUser = userRepository.findByProviderAndProviderId(
                userInfo.getProvider(), userInfo.getProviderId());

        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
        } else {
            Optional<User> userByEmail = userRepository.findByEmail(userInfo.getEmail());
            if (userByEmail.isPresent()) {
                // 같은 이메일의 기존 계정에 새 OAuth 제공자 연동
                user = userByEmail.get();
                user.linkOAuthProvider(userInfo.getProvider(), userInfo.getProviderId());
                if (userInfo.getProfileImageUrl() != null) {
                    user.updateProfileImageUrl(userInfo.getProfileImageUrl());
                }
                userRepository.save(user);
            } else {
                String nickname = generateUniqueNickname(userInfo.getNickname());

                user = User.builder()
                        .email(userInfo.getEmail())
                        .nickname(nickname)
                        .provider(userInfo.getProvider())
                        .providerId(userInfo.getProviderId())
                        .profileImageUrl(userInfo.getProfileImageUrl())
                        .emailVerified(true)
                        .build();

                userRepository.save(user);
            }
        }

        String accessToken = jwtUtil.generateAccessToken(
                user.getUserId(),
                user.getEmail(),
                user.getNickname(),
                user.getId()
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

    private String generateUniqueNickname(String baseName) {
        String nickname = baseName;
        if (nickname == null || nickname.isEmpty()) {
            nickname = "User";
        }

        if (nickname.length() > 15) {
            nickname = nickname.substring(0, 15);
        }

        if (!userRepository.existsByNickname(nickname)) {
            return nickname;
        }

        int suffix = 1;
        String candidate;
        do {
            candidate = nickname.length() > 12
                ? nickname.substring(0, 12) + suffix
                : nickname + suffix;
            suffix++;
        } while (userRepository.existsByNickname(candidate) && suffix < 10000);

        return candidate;
    }
}
