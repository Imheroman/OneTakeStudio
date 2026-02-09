package com.onetake.core.auth.exception;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.destination.exception.DestinationAlreadyExistsException;
import com.onetake.core.destination.exception.DestinationException;
import com.onetake.core.destination.exception.DestinationNotFoundException;
import com.onetake.core.library.exception.ClipGenerationInProgressException;
import com.onetake.core.library.exception.ClipNotFoundException;
import com.onetake.core.library.exception.RecordingAccessDeniedException;
import com.onetake.core.library.exception.RecordingNotFoundException;
import com.onetake.core.studio.exception.*;
import com.onetake.core.user.exception.UserNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthException(AuthException e) {
        log.warn("AuthException: {}", e.getMessage());
        return ResponseEntity
                .status(e.getStatus())
                .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleUserNotFoundException(UserNotFoundException e) {
        log.warn("UserNotFoundException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(DestinationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDestinationException(DestinationException e) {
        log.warn("DestinationException: {}", e.getMessage());
        return ResponseEntity
                .status(e.getStatus())
                .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException e) {
        String errorMessage = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        log.warn("Validation error: {}", errorMessage);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(errorMessage));
    }

    @ExceptionHandler(DestinationNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleDestinationNotFoundException(DestinationNotFoundException e) {
        log.warn("DestinationNotFoundException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(DestinationAlreadyExistsException.class)
    public ResponseEntity<ApiResponse<Void>> handleDestinationAlreadyExistsException(DestinationAlreadyExistsException e) {
        log.warn("DestinationAlreadyExistsException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(StudioNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleStudioNotFoundException(StudioNotFoundException e) {
        log.warn("StudioNotFoundException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(StudioAccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleStudioAccessDeniedException(StudioAccessDeniedException e) {
        log.warn("StudioAccessDeniedException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(StudioInUseException.class)
    public ResponseEntity<ApiResponse<Void>> handleStudioInUseException(StudioInUseException e) {
        log.warn("StudioInUseException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(MemberNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleMemberNotFoundException(MemberNotFoundException e) {
        log.warn("MemberNotFoundException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(InvalidRoleException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidRoleException(InvalidRoleException e) {
        log.warn("InvalidRoleException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(SceneNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleSceneNotFoundException(SceneNotFoundException e) {
        log.warn("SceneNotFoundException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(AssetNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleAssetNotFoundException(AssetNotFoundException e) {
        log.warn("AssetNotFoundException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(BannerNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleBannerNotFoundException(BannerNotFoundException e) {
        log.warn("BannerNotFoundException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("IllegalArgumentException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(RecordingNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleRecordingNotFoundException(RecordingNotFoundException e) {
        log.warn("RecordingNotFoundException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(RecordingAccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleRecordingAccessDeniedException(RecordingAccessDeniedException e) {
        log.warn("RecordingAccessDeniedException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(ClipGenerationInProgressException.class)
    public ResponseEntity<ApiResponse<Void>> handleClipGenerationInProgressException(ClipGenerationInProgressException e) {
        log.warn("ClipGenerationInProgressException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(ClipNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleClipNotFoundException(ClipNotFoundException e) {
        log.warn("ClipNotFoundException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(InviteNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleInviteNotFoundException(InviteNotFoundException e) {
        log.warn("InviteNotFoundException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(InviteExpiredException.class)
    public ResponseEntity<ApiResponse<Void>> handleInviteExpiredException(InviteExpiredException e) {
        log.warn("InviteExpiredException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.GONE)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(InviteNotForUserException.class)
    public ResponseEntity<ApiResponse<Void>> handleInviteNotForUserException(InviteNotForUserException e) {
        log.warn("InviteNotForUserException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(HostCannotLeaveException.class)
    public ResponseEntity<ApiResponse<Void>> handleHostCannotLeaveException(HostCannotLeaveException e) {
        log.warn("HostCannotLeaveException: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("Unexpected error: {} - {}", e.getClass().getSimpleName(), e.getMessage(), e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("서버 오류가 발생했습니다."));
    }
}
