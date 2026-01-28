package com.onetake.core.studio.exception;

public class StudioNotFoundException extends RuntimeException {

    private static final String ERROR_CODE = "STUDIO_NOT_FOUND";

    public StudioNotFoundException(String studioId) {
        super("스튜디오를 찾을 수 없습니다: " + studioId);
    }

    public StudioNotFoundException(Long id) {
        super("스튜디오를 찾을 수 없습니다: " + id);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
