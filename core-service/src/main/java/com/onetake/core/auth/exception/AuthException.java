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

    public static AuthException duplicateUsername() {
        return new AuthException("이미 사용 중인 아이디입니다.", HttpStatus.CONFLICT);
    }

    public static AuthException invalidCredentials() {
        return new AuthException("아이디 또는 비밀번호가 올바르지 않습니다.", HttpStatus.UNAUTHORIZED);
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
}
