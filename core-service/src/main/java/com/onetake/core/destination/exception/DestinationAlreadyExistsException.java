package com.onetake.core.destination.exception;

public class DestinationAlreadyExistsException extends RuntimeException {

    public DestinationAlreadyExistsException(String platform, String channelId) {
        super("이미 등록된 채널입니다: " + platform + " - " + channelId);
    }
}
