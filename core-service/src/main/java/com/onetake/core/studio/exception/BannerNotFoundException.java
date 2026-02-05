package com.onetake.core.studio.exception;

public class BannerNotFoundException extends RuntimeException {

    private static final String ERROR_CODE = "BANNER_NOT_FOUND";

    public BannerNotFoundException(String bannerId) {
        super("배너를 찾을 수 없습니다: " + bannerId);
    }

    public BannerNotFoundException(Long id) {
        super("배너를 찾을 수 없습니다: " + id);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
