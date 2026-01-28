package com.onetake.core.studio.exception;

public class StudioAccessDeniedException extends RuntimeException {

    private static final String ERROR_CODE = "STUDIO_ACCESS_DENIED";

    public StudioAccessDeniedException() {
        super("스튜디오에 대한 접근 권한이 없습니다.");
    }

    public StudioAccessDeniedException(String message) {
        super(message);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
