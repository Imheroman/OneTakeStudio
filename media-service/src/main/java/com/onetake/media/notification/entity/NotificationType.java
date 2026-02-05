package com.onetake.media.notification.entity;

/**
 * 알림 타입
 */
public enum NotificationType {
    /**
     * 숏츠 생성 시작
     */
    SHORTS_PROCESSING,

    /**
     * 숏츠 생성 완료
     */
    SHORTS_COMPLETED,

    /**
     * 숏츠 생성 실패
     */
    SHORTS_FAILED,

    /**
     * 녹화 완료
     */
    RECORDING_COMPLETED,

    /**
     * 녹화 실패
     */
    RECORDING_FAILED
}
