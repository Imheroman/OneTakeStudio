package com.onetakestudio.mediaservice.publish.entity;

public enum PublishStatus {
    PENDING,      // 송출 준비 중
    PUBLISHING,   // 송출 중
    STOPPED,      // 송출 중지됨
    FAILED        // 송출 실패
}
