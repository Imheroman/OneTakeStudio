package com.onetake.core.studio.exception;

public class InviteNotFoundException extends RuntimeException {

    private static final String ERROR_CODE = "INVITE_NOT_FOUND";

    public InviteNotFoundException(String inviteId) {
        super("초대를 찾을 수 없습니다: " + inviteId);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
