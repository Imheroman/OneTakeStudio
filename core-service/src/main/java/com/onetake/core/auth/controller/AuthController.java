package com.onetake.core.auth.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.auth.dto.*;
import com.onetake.core.auth.service.AuthService;
import com.onetake.core.auth.service.EmailVerificationService;
import com.onetake.core.auth.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/send-verification")
    public ResponseEntity<ApiResponse<Void>> sendVerification(
            @RequestBody @Valid SendVerificationRequest request) {
        emailVerificationService.sendVerificationCode(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("인증 코드가 발송되었습니다."));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(
            @RequestBody @Valid VerifyEmailRequest request) {
        emailVerificationService.verifyCode(request.getEmail(), request.getCode());
        return ResponseEntity.ok(ApiResponse.success("이메일 인증이 완료되었습니다."));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@RequestBody @Valid RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("회원가입이 완료되었습니다."));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@RequestBody @Valid LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("로그인 성공", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenRefreshResponse>> refreshToken(
            @RequestBody @Valid TokenRefreshRequest request) {
        TokenRefreshResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success("토큰 갱신 성공", response));
    }

    @GetMapping("/check-email")
    public ResponseEntity<ApiResponse<CheckEmailResponse>> checkEmail(@RequestParam String email) {
        CheckEmailResponse response = authService.checkEmailAvailable(email);
        String message = switch (response.getReason()) {
            case "AVAILABLE" -> "사용 가능한 이메일입니다.";
            case "INVALID_FORMAT" -> "올바른 이메일 형식이 아닙니다.";
            case "DUPLICATED" -> "이미 사용 중인 이메일입니다.";
            default -> "알 수 없는 오류입니다.";
        };
        return ResponseEntity.ok(ApiResponse.success(message, response));
    }

    @PostMapping("/password-reset")
    public ResponseEntity<ApiResponse<Void>> requestPasswordReset(
            @RequestBody @Valid PasswordResetRequest request) {
        passwordResetService.requestPasswordReset(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("비밀번호 재설정 이메일이 발송되었습니다."));
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmPasswordReset(
            @RequestBody @Valid PasswordResetConfirmRequest request) {
        passwordResetService.confirmPasswordReset(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success("비밀번호가 성공적으로 변경되었습니다."));
    }

    @PostMapping("/oauth/google")
    public ResponseEntity<ApiResponse<LoginResponse>> oauthGoogle(
            @RequestBody @Valid OAuthLoginRequest request) {
        LoginResponse response = authService.oauthLoginGoogle(request);
        return ResponseEntity.ok(ApiResponse.success("Google 로그인 성공", response));
    }

    @PostMapping("/oauth/kakao")
    public ResponseEntity<ApiResponse<LoginResponse>> oauthKakao(
            @RequestBody @Valid OAuthLoginRequest request) {
        LoginResponse response = authService.oauthLoginKakao(request);
        return ResponseEntity.ok(ApiResponse.success("Kakao 로그인 성공", response));
    }

    @PostMapping("/oauth/naver")
    public ResponseEntity<ApiResponse<LoginResponse>> oauthNaver(
            @RequestBody @Valid OAuthLoginRequest request) {
        LoginResponse response = authService.oauthLoginNaver(request);
        return ResponseEntity.ok(ApiResponse.success("Naver 로그인 성공", response));
    }

    // ==================== Code 기반 OAuth 로그인 (Authorization Code Flow) ====================

    @PostMapping("/oauth/google/callback")
    public ResponseEntity<ApiResponse<LoginResponse>> oauthGoogleCallback(
            @RequestBody @Valid OAuthCodeRequest request) {
        LoginResponse response = authService.oauthLoginGoogleWithCode(request.getCode(), request.getRedirectUri());
        return ResponseEntity.ok(ApiResponse.success("Google 로그인 성공", response));
    }

    @PostMapping("/oauth/kakao/callback")
    public ResponseEntity<ApiResponse<LoginResponse>> oauthKakaoCallback(
            @RequestBody @Valid OAuthCodeRequest request) {
        LoginResponse response = authService.oauthLoginKakaoWithCode(request.getCode(), request.getRedirectUri());
        return ResponseEntity.ok(ApiResponse.success("Kakao 로그인 성공", response));
    }

    @PostMapping("/oauth/naver/callback")
    public ResponseEntity<ApiResponse<LoginResponse>> oauthNaverCallback(
            @RequestBody @Valid OAuthCodeRequest request) {
        LoginResponse response = authService.oauthLoginNaverWithCode(request.getCode(), request.getRedirectUri());
        return ResponseEntity.ok(ApiResponse.success("Naver 로그인 성공", response));
    }
}
