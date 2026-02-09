package com.onetake.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final String resultCode;
    private final boolean success;
    private final String message;
    private final T data;
    private final String errorCode;

    private ApiResponse(String resultCode, boolean success, String message, T data, String errorCode) {
        this.resultCode = resultCode;
        this.success = success;
        this.message = message;
        this.data = data;
        this.errorCode = errorCode;
    }

    public static <T> ApiResponse<T> success(String message) {
        return new ApiResponse<>("SUCCESS", true, message, null, null);
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>("SUCCESS", true, message, data, null);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>("FAILURE", false, message, null, null);
    }

    public static <T> ApiResponse<T> error(String message, String errorCode) {
        return new ApiResponse<>("FAILURE", false, message, null, errorCode);
    }

    public static <T> ApiResponse<T> error(String message, T data) {
        return new ApiResponse<>("FAILURE", false, message, data, null);
    }
}
