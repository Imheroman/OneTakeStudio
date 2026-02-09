package com.onetake.core.destination.exception;

public class DestinationNotFoundException extends RuntimeException {

    public DestinationNotFoundException(String destinationId) {
        super("송출 채널을 찾을 수 없습니다: " + destinationId);
    }
}
