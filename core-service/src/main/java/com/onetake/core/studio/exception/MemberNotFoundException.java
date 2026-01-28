package com.onetake.core.studio.exception;

public class MemberNotFoundException extends RuntimeException {

    private static final String ERROR_CODE = "MEMBER_NOT_FOUND";

    public MemberNotFoundException(Long memberId) {
        super("멤버를 찾을 수 없습니다: " + memberId);
    }

    public MemberNotFoundException(String message) {
        super(message);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
