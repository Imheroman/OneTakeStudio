package com.onetakestudio.mediaservice.recording.entity;

public enum RecordingStatus {
    PENDING,      // 녹화 준비 중
    RECORDING,    // 녹화 중
    PAUSED,       // 녹화 일시정지
    PROCESSING,   // 처리 중
    UPLOADING,    // 업로드 중
    COMPLETED,    // 완료
    FAILED        // 실패
}
