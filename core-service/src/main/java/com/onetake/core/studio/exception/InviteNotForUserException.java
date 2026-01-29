package com.onetake.core.studio.exception;

public class InviteNotForUserException extends RuntimeException {

    private static final String ERROR_CODE = "INVITE_NOT_FOR_USER";

    public InviteNotForUserException() {
        super("해당 초대의 대상자가 아닙니다.");
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
