package com.onetake.core.studio.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.studio.dto.StudioIdResponse;
import com.onetake.core.studio.service.StudioService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 내부 서비스 간 통신용 API
 * API Gateway를 통하지 않고 직접 호출
 */
@Slf4j
@RestController
@RequestMapping("/api/internal/studios")
@RequiredArgsConstructor
public class StudioInternalController {

    private final StudioService studioService;

    /**
     * UUID로 스튜디오 내부 ID 조회
     */
    @GetMapping("/by-uuid/{uuid}")
    public ResponseEntity<ApiResponse<StudioIdResponse>> getStudioIdByUuid(@PathVariable String uuid) {
        log.debug("스튜디오 ID 조회 by UUID: {}", uuid);
        StudioIdResponse response = studioService.getStudioIdByUuid(uuid);
        return ResponseEntity.ok(ApiResponse.success("스튜디오 ID 조회 성공", response));
    }
}
