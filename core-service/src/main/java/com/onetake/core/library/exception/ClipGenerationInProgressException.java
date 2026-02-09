package com.onetake.core.library.exception;

public class ClipGenerationInProgressException extends RuntimeException {

    private static final String ERROR_CODE = "CLIP_GENERATION_IN_PROGRESS";

    public ClipGenerationInProgressException(String recordingId) {
        super("클립 생성 중인 녹화는 삭제할 수 없습니다: " + recordingId);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
