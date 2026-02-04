package com.onetake.media.shorts.entity;

/**
 * AI 숏츠 생성 작업 상태
 */
public enum ShortsStatus {
    /**
     * 요청 대기 중
     */
    PENDING,

    /**
     * AI 서버에서 처리 중
     */
    PROCESSING,

    /**
     * 생성 완료
     */
    COMPLETED,

    /**
     * 생성 실패
     */
    FAILED
}
