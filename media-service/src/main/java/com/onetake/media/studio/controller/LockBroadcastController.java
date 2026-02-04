package com.onetake.media.studio.controller;

import com.onetake.media.studio.service.StudioStateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 내부 API: 락 상태 변경 브로드캐스트
 * core-service에서 호출하여 WebSocket으로 브로드캐스트
 */
@Slf4j
@RestController
@RequestMapping("/api/internal/studio")
@RequiredArgsConstructor
public class LockBroadcastController {

    private final StudioStateService studioStateService;

    /**
     * 락 획득 브로드캐스트
     * POST /api/internal/studio/{studioId}/lock/acquired
     */
    @PostMapping("/{studioId}/lock/acquired")
    public ResponseEntity<Map<String, Object>> broadcastLockAcquired(
            @PathVariable String studioId,
            @RequestBody LockBroadcastRequest request) {

        log.info("락 획득 브로드캐스트 요청: studioId={}, userId={}, nickname={}",
                studioId, request.userId(), request.nickname());

        studioStateService.broadcastLockAcquired(studioId, request.userId(), request.nickname());

        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * 락 해제 브로드캐스트
     * POST /api/internal/studio/{studioId}/lock/released
     */
    @PostMapping("/{studioId}/lock/released")
    public ResponseEntity<Map<String, Object>> broadcastLockReleased(
            @PathVariable String studioId,
            @RequestBody LockBroadcastRequest request) {

        log.info("락 해제 브로드캐스트 요청: studioId={}, userId={}, nickname={}",
                studioId, request.userId(), request.nickname());

        studioStateService.broadcastLockReleased(studioId, request.userId(), request.nickname());

        return ResponseEntity.ok(Map.of("success", true));
    }

    public record LockBroadcastRequest(
            String userId,
            String nickname
    ) {}
}
