package com.onetake.core.library.exception;

public class StorageQuotaExceededException extends RuntimeException {

    private static final String ERROR_CODE = "STORAGE_QUOTA_EXCEEDED";

    public StorageQuotaExceededException(String userId, Long requiredBytes, Long availableBytes) {
        super(String.format("스토리지 용량이 부족합니다. 필요: %.2fGB, 사용 가능: %.2fGB (사용자: %s)",
                requiredBytes / (1024.0 * 1024.0 * 1024.0),
                availableBytes / (1024.0 * 1024.0 * 1024.0),
                userId));
    }

    public StorageQuotaExceededException(String message) {
        super(message);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
