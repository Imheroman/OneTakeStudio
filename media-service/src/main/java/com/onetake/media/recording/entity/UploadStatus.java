package com.onetake.media.recording.entity;

/**
 * 외부 서버 업로드 상태
 */
public enum UploadStatus {
    PENDING,      // 업로드 대기 중
    UPLOADING,    // 업로드 진행 중
    COMPLETED,    // 업로드 완료
    FAILED        // 업로드 실패
}
