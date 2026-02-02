package com.onetake.core.studio.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import com.onetake.core.studio.dto.*;
import com.onetake.core.studio.service.StudioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/studios")
@RequiredArgsConstructor
public class StudioController {

    private final StudioService studioService;

    @PostMapping
    public ResponseEntity<ApiResponse<StudioDetailResponse>> createStudio(
            @CurrentUser CustomUserDetails userDetails,
            @Valid @RequestBody CreateStudioRequest request) {

        log.debug("스튜디오 생성 요청: userId={}", userDetails.getUserId());
        StudioDetailResponse studio = studioService.createStudio(userDetails.getUserId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("스튜디오 생성 성공", studio));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudioResponse>>> getMyStudios(
            @CurrentUser CustomUserDetails userDetails) {

        log.debug("스튜디오 목록 조회 요청: userId={}", userDetails.getUserId());
        List<StudioResponse> studios = studioService.getMyStudios(userDetails.getUserId());

        return ResponseEntity.ok(ApiResponse.success("스튜디오 목록 조회 성공", studios));
    }

    @GetMapping("/{studioId}")
    public ResponseEntity<ApiResponse<StudioDetailResponse>> getStudioDetail(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable Long studioId) {

        log.debug("스튜디오 상세 조회 요청: studioId={}", studioId);
        StudioDetailResponse studio = studioService.getStudioDetail(userDetails.getUserId(), studioId);

        return ResponseEntity.ok(ApiResponse.success("스튜디오 상세 조회 성공", studio));
    }

    @PatchMapping("/{studioId}")
    public ResponseEntity<ApiResponse<StudioDetailResponse>> updateStudio(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable Long studioId,
            @Valid @RequestBody UpdateStudioRequest request) {

        log.debug("스튜디오 수정 요청: studioId={}", studioId);
        StudioDetailResponse studio = studioService.updateStudio(userDetails.getUserId(), studioId, request);

        return ResponseEntity.ok(ApiResponse.success("스튜디오 수정 성공", studio));
    }

    @DeleteMapping("/{studioId}")
    public ResponseEntity<ApiResponse<Void>> deleteStudio(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable Long studioId) {

        log.debug("스튜디오 삭제 요청: studioId={}", studioId);
        studioService.deleteStudio(userDetails.getUserId(), studioId);

        return ResponseEntity.ok(ApiResponse.success("스튜디오 삭제 성공"));
    }

    // ==================== Note ====================

    @GetMapping("/{studioId}/note")
    public ResponseEntity<ApiResponse<NoteResponse>> getNote(
            @PathVariable Long studioId) {

        log.debug("스튜디오 노트 조회: studioId={}", studioId);
        NoteResponse note = studioService.getNote(studioId);

        return ResponseEntity.ok(ApiResponse.success("노트 조회 성공", note));
    }

    @PutMapping("/{studioId}/note")
    public ResponseEntity<ApiResponse<NoteResponse>> updateNote(
            @PathVariable Long studioId,
            @RequestBody NoteRequest request) {

        log.debug("스튜디오 노트 업데이트: studioId={}", studioId);
        NoteResponse note = studioService.updateNote(studioId, request.getContent());

        return ResponseEntity.ok(ApiResponse.success("노트 저장 성공", note));
    }
}
