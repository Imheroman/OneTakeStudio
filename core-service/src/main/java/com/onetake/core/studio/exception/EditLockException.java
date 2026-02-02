package com.onetake.core.studio.exception;

import lombok.Getter;

@Getter
public class EditLockException extends RuntimeException {

    private final String lockedByUserId;
    private final String lockedByNickname;

    public EditLockException(String message, String lockedByUserId, String lockedByNickname) {
        super(message);
        this.lockedByUserId = lockedByUserId;
        this.lockedByNickname = lockedByNickname;
    }
}
