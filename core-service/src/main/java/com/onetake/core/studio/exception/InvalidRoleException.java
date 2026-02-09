package com.onetake.core.studio.exception;

public class InvalidRoleException extends RuntimeException {

    private static final String ERROR_CODE = "INVALID_ROLE";

    public InvalidRoleException(String role) {
        super("유효하지 않은 역할입니다: " + role);
    }

    public InvalidRoleException() {
        super("유효하지 않은 역할입니다.");
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
