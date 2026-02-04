package com.onetake.storage.upload.entity;

/**
 * 업로드 세션 상태
 */
public enum UploadSessionStatus {
    INITIALIZED,  // 세션 초기화됨 (청크 수신 대기)
    UPLOADING,    // 청크 업로드 진행 중
    MERGING,      // 청크 병합 중
    COMPLETED,    // 완료
    FAILED,       // 실패
    EXPIRED       // 만료
}
