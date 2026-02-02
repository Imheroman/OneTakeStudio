package com.onetake.core.studio.exception;

public class HostCannotLeaveException extends RuntimeException {

    private static final String ERROR_CODE = "HOST_CANNOT_LEAVE";

    public HostCannotLeaveException() {
        super("호스트는 스튜디오를 탈퇴할 수 없습니다. 스튜디오를 삭제하거나 다른 멤버에게 호스트 권한을 위임하세요.");
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
