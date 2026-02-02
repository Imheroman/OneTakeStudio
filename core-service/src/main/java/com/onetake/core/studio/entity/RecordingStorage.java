package com.onetake.core.studio.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 녹화 저장 위치 설정
 */
@Getter
@RequiredArgsConstructor
public enum RecordingStorage {
    LOCAL("로컬", "사용자 컴퓨터에 다운로드"),
    CLOUD("클라우드", "서버에 저장");

    private final String displayName;
    private final String description;
}
