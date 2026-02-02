package com.onetake.core.studio.exception;

public class AssetNotFoundException extends RuntimeException {

    private static final String ERROR_CODE = "ASSET_NOT_FOUND";

    public AssetNotFoundException(String assetId) {
        super("에셋을 찾을 수 없습니다: " + assetId);
    }

    public AssetNotFoundException(Long id) {
        super("에셋을 찾을 수 없습니다: " + id);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
