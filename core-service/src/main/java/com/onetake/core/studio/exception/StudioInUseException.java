package com.onetake.core.studio.exception;

public class StudioInUseException extends RuntimeException {

    private static final String ERROR_CODE = "STUDIO_IN_USE";

    public StudioInUseException() {
        super("스튜디오가 현재 사용 중입니다.");
    }

    public StudioInUseException(String message) {
        super(message);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
