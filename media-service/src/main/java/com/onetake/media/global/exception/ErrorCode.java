package com.onetake.media.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // Common
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C001", "서버 내부 오류가 발생했습니다"),
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "C002", "잘못된 입력값입니다"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "C003", "인증이 필요합니다"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "C004", "접근 권한이 없습니다"),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "C005", "리소스를 찾을 수 없습니다"),

    // Stream
    STREAM_SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "S001", "스트림 세션을 찾을 수 없습니다"),
    STREAM_ALREADY_ACTIVE(HttpStatus.CONFLICT, "S002", "이미 활성화된 스트림이 있습니다"),
    STREAM_CONNECTION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "S003", "스트림 연결에 실패했습니다"),
    LIVEKIT_TOKEN_GENERATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "S004", "LiveKit 토큰 생성에 실패했습니다"),

    // Recording
    RECORDING_NOT_FOUND(HttpStatus.NOT_FOUND, "R001", "녹화를 찾을 수 없습니다"),
    RECORDING_ALREADY_IN_PROGRESS(HttpStatus.CONFLICT, "R002", "이미 녹화가 진행 중입니다"),
    RECORDING_NOT_IN_PROGRESS(HttpStatus.BAD_REQUEST, "R003", "진행 중인 녹화가 없습니다"),
    RECORDING_NOT_PAUSED(HttpStatus.BAD_REQUEST, "R004", "일시정지된 녹화가 없습니다"),
    RECORDING_START_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "R005", "녹화 시작에 실패했습니다"),
    RECORDING_STOP_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "R006", "녹화 종료에 실패했습니다"),

    // Publish
    PUBLISH_SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "P001", "송출 세션을 찾을 수 없습니다"),
    PUBLISH_ALREADY_IN_PROGRESS(HttpStatus.CONFLICT, "P002", "이미 송출이 진행 중입니다"),
    PUBLISH_NOT_IN_PROGRESS(HttpStatus.BAD_REQUEST, "P003", "진행 중인 송출이 없습니다"),
    PUBLISH_DESTINATION_INVALID(HttpStatus.BAD_REQUEST, "P004", "잘못된 송출 대상입니다"),
    RTMP_CONNECTION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "P005", "RTMP 연결에 실패했습니다"),

    // ScreenShare
    SCREEN_SHARE_NOT_FOUND(HttpStatus.NOT_FOUND, "SS001", "화면 공유를 찾을 수 없습니다"),
    SCREEN_SHARE_ALREADY_ACTIVE(HttpStatus.CONFLICT, "SS002", "이미 화면 공유가 진행 중입니다"),
    SCREEN_SHARE_NOT_ACTIVE(HttpStatus.BAD_REQUEST, "SS003", "활성화된 화면 공유가 없습니다"),

    // S3
    S3_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "F001", "파일 업로드에 실패했습니다"),
    S3_DOWNLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "F002", "파일 다운로드에 실패했습니다");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
