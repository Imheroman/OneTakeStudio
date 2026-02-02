package com.onetake.core.library.exception;

public class RecordingNotFoundException extends RuntimeException {

    private static final String ERROR_CODE = "RECORDING_NOT_FOUND";

    public RecordingNotFoundException(String recordingId) {
        super("녹화를 찾을 수 없습니다: " + recordingId);
    }

    public RecordingNotFoundException(Long id) {
        super("녹화를 찾을 수 없습니다: " + id);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
