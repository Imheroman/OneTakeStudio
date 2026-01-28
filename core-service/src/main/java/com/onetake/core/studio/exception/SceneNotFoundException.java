package com.onetake.core.studio.exception;

public class SceneNotFoundException extends RuntimeException {

    private static final String ERROR_CODE = "SCENE_NOT_FOUND";

    public SceneNotFoundException(String sceneId) {
        super("씬을 찾을 수 없습니다: " + sceneId);
    }

    public SceneNotFoundException(Long id) {
        super("씬을 찾을 수 없습니다: " + id);
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}
