package com.onetake.media.studio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * 스튜디오 상태 변경 메시지
 * WebSocket을 통해 브로드캐스트됨
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudioStateMessage {

    /**
     * 메시지 타입
     */
    private StudioStateType type;

    /**
     * 스튜디오 ID (외부 UUID)
     */
    private String studioId;

    /**
     * 변경을 수행한 사용자 ID
     */
    private String userId;

    /**
     * 변경을 수행한 사용자 닉네임
     */
    private String nickname;

    /**
     * 상태 데이터 (타입에 따라 다름)
     */
    private Map<String, Object> payload;

    /**
     * 타임스탬프 (ISO 8601 문자열 - 프론트엔드와 호환)
     */
    @Builder.Default
    private String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

    public enum StudioStateType {
        // 레이아웃 관련
        LAYOUT_CHANGE,          // 레이아웃 변경 (single, pip, side-by-side 등)

        // 소스 관련
        SOURCE_ADDED,           // 소스 추가
        SOURCE_REMOVED,         // 소스 제거
        SOURCE_TRANSFORM,       // 소스 위치/크기 변경
        SOURCE_TOGGLED,         // 소스 on/off
        SOURCE_REORDERED,       // 소스 순서 변경
        SOURCE_BROUGHT_FRONT,   // 소스 맨 앞으로
        SOURCE_ADDED_TO_STAGE,  // 소스 스테이지 추가
        SOURCE_REMOVED_FROM_STAGE, // 소스 스테이지 제거

        // 배너/에셋 관련
        BANNER_SELECTED,        // 배너 선택
        BANNER_DESELECTED,      // 배너 해제
        ASSET_SELECTED,         // 에셋 선택
        ASSET_DESELECTED,       // 에셋 해제

        // 스타일 관련
        STYLE_CHANGE,           // 스타일 변경

        // 편집 락 관련
        LOCK_ACQUIRED,          // 락 획득
        LOCK_RELEASED,          // 락 해제
        LOCK_EXPIRED,           // 락 만료

        // 씬 관련
        SCENE_SELECTED,         // 씬 선택
        SCENE_SAVED,            // 씬 저장

        // 기타
        EDIT_MODE_CHANGED,      // 편집 모드 on/off
        RESOLUTION_CHANGED,     // 해상도 변경
        MEMBER_JOINED,          // 멤버 입장
        MEMBER_LEFT,            // 멤버 퇴장
        CURRENT_MEMBERS,        // 현재 접속자 목록 (새 접속자에게 전송)
        FULL_STATE_SYNC         // 전체 상태 동기화 (새 접속자에게 현재 상태 전송)
    }
}
