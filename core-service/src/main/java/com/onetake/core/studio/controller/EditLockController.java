package com.onetake.core.studio.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import com.onetake.core.studio.dto.EditLockRequest;
import com.onetake.core.studio.dto.EditLockResponse;
import com.onetake.core.studio.exception.EditLockException;
import com.onetake.core.studio.service.EditLockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 스튜디오 편집 락 API
 * 동시 편집 방지를 위한 락 획득/해제/조회
 */
@Slf4j
@RestController
@RequestMapping("/api/studios/{studioId}/edit-lock")
@RequiredArgsConstructor
public class EditLockController {

    private final EditLockService editLockService;

    /**
     * 편집 락 획득
     * POST /api/studios/{studioId}/edit-lock
     */
    @PostMapping
    public ResponseEntity<ApiResponse<EditLockResponse>> acquireLock(
            @PathVariable String studioId,
            @CurrentUser CustomUserDetails userDetails,
            @RequestBody(required = false) EditLockRequest request) {

        log.debug("편집 락 획득 요청: studioId={}, userId={}", studioId, userDetails.getUserId());

        try {
            EditLockResponse response;

            // extend 옵션이 있으면 갱신
            if (request != null && Boolean.TRUE.equals(request.getExtend())) {
                response = editLockService.extendLock(
                        studioId,
                        userDetails.getUserId(),
                        userDetails.getNickname()
                );
            } else {
                response = editLockService.acquireLock(
                        studioId,
                        userDetails.getUserId(),
                        userDetails.getNickname()
                );
            }

            return ResponseEntity.ok(ApiResponse.success("편집 락 획득 성공", response));
        } catch (EditLockException e) {
            log.debug("편집 락 획득 실패: studioId={}, reason={}", studioId, e.getMessage());
            EditLockResponse response = EditLockResponse.of(
                    e.getLockedByUserId(),
                    e.getLockedByNickname(),
                    null,
                    null,
                    userDetails.getUserId()
            );
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error(e.getMessage(), response));
        }
    }

    /**
     * 편집 락 해제
     * DELETE /api/studios/{studioId}/edit-lock
     */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> releaseLock(
            @PathVariable String studioId,
            @CurrentUser CustomUserDetails userDetails) {

        log.debug("편집 락 해제 요청: studioId={}, userId={}", studioId, userDetails.getUserId());

        try {
            editLockService.releaseLock(studioId, userDetails.getUserId());
            return ResponseEntity.ok(ApiResponse.success("편집 락 해제 성공"));
        } catch (EditLockException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 편집 락 상태 조회
     * GET /api/studios/{studioId}/edit-lock
     */
    @GetMapping
    public ResponseEntity<ApiResponse<EditLockResponse>> getLockStatus(
            @PathVariable String studioId,
            @CurrentUser CustomUserDetails userDetails) {

        log.debug("편집 락 상태 조회: studioId={}, userId={}", studioId, userDetails.getUserId());

        EditLockResponse response = editLockService.getLockStatus(studioId, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("편집 락 상태 조회 성공", response));
    }

    /**
     * 편집 락 강제 해제 (호스트 전용)
     * DELETE /api/studios/{studioId}/edit-lock/force
     */
    @DeleteMapping("/force")
    public ResponseEntity<ApiResponse<Void>> forceReleaseLock(
            @PathVariable String studioId,
            @CurrentUser CustomUserDetails userDetails) {

        log.info("편집 락 강제 해제 요청: studioId={}, userId={}", studioId, userDetails.getUserId());

        // TODO: 호스트/관리자 권한 체크 추가 필요
        editLockService.forceReleaseLock(studioId);
        return ResponseEntity.ok(ApiResponse.success("편집 락 강제 해제 성공"));
    }
}
