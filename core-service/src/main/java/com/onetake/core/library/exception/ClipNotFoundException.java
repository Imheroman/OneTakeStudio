package com.onetake.core.library.exception;

public class ClipNotFoundException extends RuntimeException {

    private static final String ERROR_CODE = "CLIP_NOT_FOUND";

    public ClipNotFoundException(String clipId) {
        super("클립을 찾을 수 없습니다: " + clipId);
    }

    public ClipNotFoundException(Long id) {
        super("클립을 찾을 수 없습니다: " + id);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
