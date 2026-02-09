package com.onetake.media.studio.controller;

import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.studio.dto.StudioStateMessage;
import com.onetake.media.studio.service.StudioStateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 스튜디오 상태 동기화 REST API
 * 외부에서 상태 브로드캐스트를 트리거할 때 사용
 */
@Slf4j
@RestController
@RequestMapping("/api/media/studio")
@RequiredArgsConstructor
public class StudioStateController {

    private final StudioStateService studioStateService;

    /**
     * 상태 브로드캐스트 (일반)
     * POST /api/media/studio/{studioId}/broadcast
     */
    @PostMapping("/{studioId}/broadcast")
    public ResponseEntity<ApiResponse<Void>> broadcastState(
            @PathVariable String studioId,
            @RequestBody StudioStateMessage message) {

        log.debug("상태 브로드캐스트 요청: studioId={}, type={}", studioId, message.getType());

        StudioStateMessage broadcastMessage = StudioStateMessage.builder()
                .type(message.getType())
                .studioId(studioId)
                .userId(message.getUserId())
                .nickname(message.getNickname())
                .payload(message.getPayload())
                .build();

        studioStateService.broadcastState(studioId, broadcastMessage);

        return ResponseEntity.ok(ApiResponse.success("상태 브로드캐스트 완료"));
    }

    /**
     * 편집 락 상태 브로드캐스트
     * POST /api/media/studio/{studioId}/lock/broadcast
     */
    @PostMapping("/{studioId}/lock/broadcast")
    public ResponseEntity<ApiResponse<Void>> broadcastLock(
            @PathVariable String studioId,
            @RequestBody LockBroadcastRequest request) {

        log.debug("락 브로드캐스트 요청: studioId={}, acquired={}", studioId, request.isAcquired());

        if (request.isAcquired()) {
            studioStateService.broadcastLockAcquired(studioId, request.getUserId(), request.getNickname());
        } else {
            studioStateService.broadcastLockReleased(studioId, request.getUserId(), request.getNickname());
        }

        return ResponseEntity.ok(ApiResponse.success("락 상태 브로드캐스트 완료"));
    }

    /**
     * 멤버 프레즌스 브로드캐스트
     * POST /api/media/studio/{studioId}/presence/broadcast
     */
    @PostMapping("/{studioId}/presence/broadcast")
    public ResponseEntity<ApiResponse<Void>> broadcastPresence(
            @PathVariable String studioId,
            @RequestBody PresenceBroadcastRequest request) {

        log.debug("프레즌스 브로드캐스트 요청: studioId={}, joined={}", studioId, request.isJoined());

        if (request.isJoined()) {
            studioStateService.broadcastMemberJoined(studioId, request.getUserId(), request.getNickname());
        } else {
            studioStateService.broadcastMemberLeft(studioId, request.getUserId(), request.getNickname());
        }

        return ResponseEntity.ok(ApiResponse.success("프레즌스 브로드캐스트 완료"));
    }

    @lombok.Getter
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class LockBroadcastRequest {
        private String userId;
        private String nickname;
        private boolean acquired;
    }

    @lombok.Getter
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class PresenceBroadcastRequest {
        private String userId;
        private String nickname;
        private boolean joined;
    }
}
