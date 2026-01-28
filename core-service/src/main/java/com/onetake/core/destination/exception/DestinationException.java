package com.onetake.core.destination.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class DestinationException extends RuntimeException {

    private final HttpStatus status;

    public DestinationException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public static DestinationException notFound() {
        return new DestinationException("송출 채널을 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }

    public static DestinationException alreadyExists() {
        return new DestinationException("이미 등록된 송출 채널입니다.", HttpStatus.CONFLICT);
    }

    public static DestinationException limitExceeded() {
        return new DestinationException("송출 채널 등록 한도를 초과했습니다.", HttpStatus.BAD_REQUEST);
    }
}
