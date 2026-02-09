package com.onetake.core.auth.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AuthException extends RuntimeException {

    private final HttpStatus status;

    public AuthException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public static AuthException duplicateEmail() {
        return new AuthException("이미 사용 중인 이메일입니다.", HttpStatus.CONFLICT);
    }

    public static AuthException duplicateNickname() {
        return new AuthException("이미 사용 중인 닉네임입니다.", HttpStatus.CONFLICT);
    }

    public static AuthException invalidCredentials() {
        return new AuthException("이메일 또는 비밀번호가 올바르지 않습니다.", HttpStatus.UNAUTHORIZED);
    }

    public static AuthException invalidToken() {
        return new AuthException("유효하지 않은 토큰입니다.", HttpStatus.UNAUTHORIZED);
    }

    public static AuthException expiredToken() {
        return new AuthException("만료된 토큰입니다.", HttpStatus.UNAUTHORIZED);
    }

    public static AuthException userNotFound() {
        return new AuthException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }

    public static AuthException emailNotVerified() {
        return new AuthException("이메일 인증이 필요합니다.", HttpStatus.FORBIDDEN);
    }

    public static AuthException verificationCodeExpired() {
        return new AuthException("인증 코드가 만료되었습니다.", HttpStatus.BAD_REQUEST);
    }

    public static AuthException verificationCodeInvalid() {
        return new AuthException("인증 코드가 올바르지 않습니다.", HttpStatus.BAD_REQUEST);
    }

    public static AuthException verificationNotCompleted() {
        return new AuthException("이메일 인증이 완료되지 않았습니다.", HttpStatus.BAD_REQUEST);
    }

    public static AuthException passwordResetTokenExpired() {
        return new AuthException("비밀번호 재설정 링크가 만료되었습니다.", HttpStatus.BAD_REQUEST);
    }

    public static AuthException passwordResetTokenInvalid() {
        return new AuthException("유효하지 않은 비밀번호 재설정 링크입니다.", HttpStatus.BAD_REQUEST);
    }

    public static AuthException emailSendFailed() {
        return new AuthException("이메일 발송에 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    public static AuthException oauthFailed(String provider) {
        return new AuthException(provider + " 로그인에 실패했습니다.", HttpStatus.UNAUTHORIZED);
    }

    public static AuthException oauthEmailRequired() {
        return new AuthException("이메일 정보 제공에 동의해주세요.", HttpStatus.BAD_REQUEST);
    }
}
