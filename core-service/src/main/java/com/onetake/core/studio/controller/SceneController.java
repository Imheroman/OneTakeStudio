package com.onetake.core.studio.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import com.onetake.core.studio.dto.*;
import com.onetake.core.studio.service.SceneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/studios/{studioId}/scenes")
@RequiredArgsConstructor
public class SceneController {

    private final SceneService sceneService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SceneResponse>>> getScenes(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String studioId) {

        log.debug("씬 목록 조회 요청: studioId={}", studioId);
        List<SceneResponse> scenes = sceneService.getScenes(userDetails.getUserId(), studioId);

        return ResponseEntity.ok(ApiResponse.success("씬 목록 조회 성공", scenes));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SceneResponse>> createScene(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String studioId,
            @Valid @RequestBody CreateSceneRequest request) {

        log.debug("씬 생성 요청: studioId={}, name={}", studioId, request.getName());
        SceneResponse scene = sceneService.createScene(userDetails.getUserId(), studioId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("씬 생성 성공", scene));
    }

    @PutMapping("/{sceneId}")
    public ResponseEntity<ApiResponse<SceneResponse>> updateScene(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String studioId,
            @PathVariable Long sceneId,
            @Valid @RequestBody UpdateSceneRequest request) {

        log.debug("씬 수정 요청: studioId={}, sceneId={}", studioId, sceneId);
        SceneResponse scene = sceneService.updateScene(userDetails.getUserId(), studioId, sceneId, request);

        return ResponseEntity.ok(ApiResponse.success("씬 수정 성공", scene));
    }

    @DeleteMapping("/{sceneId}")
    public ResponseEntity<ApiResponse<Void>> deleteScene(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String studioId,
            @PathVariable Long sceneId) {

        log.debug("씬 삭제 요청: studioId={}, sceneId={}", studioId, sceneId);
        sceneService.deleteScene(userDetails.getUserId(), studioId, sceneId);

        return ResponseEntity.ok(ApiResponse.success("씬 삭제 성공"));
    }
}
