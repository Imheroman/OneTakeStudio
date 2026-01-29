package com.onetake.core.studio.exception;

public class InviteExpiredException extends RuntimeException {

    private static final String ERROR_CODE = "INVITE_EXPIRED";

    public InviteExpiredException(String inviteId) {
        super("초대가 만료되었습니다: " + inviteId);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
