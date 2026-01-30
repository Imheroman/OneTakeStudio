package com.onetake.core.library.exception;

public class RecordingAccessDeniedException extends RuntimeException {

    private static final String ERROR_CODE = "RECORDING_ACCESS_DENIED";

    public RecordingAccessDeniedException(String recordingId) {
        super("녹화에 대한 접근 권한이 없습니다: " + recordingId);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
