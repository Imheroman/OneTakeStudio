package com.onetake.core.studio.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.studio.dto.AssetResponse;
import com.onetake.core.studio.dto.CreateAssetRequest;
import com.onetake.core.studio.service.StudioAssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/studios/{studioId}/assets")
@RequiredArgsConstructor
public class StudioAssetController {

    private final StudioAssetService assetService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AssetResponse>>> getAssets(
            @PathVariable String studioId,
            @RequestParam(required = false) String type) {

        log.debug("에셋 목록 조회: studioId={}, type={}", studioId, type);

        List<AssetResponse> assets;
        if (type != null && !type.isBlank()) {
            assets = assetService.getAssetsByType(studioId, type);
        } else {
            assets = assetService.getAssets(studioId);
        }

        return ResponseEntity.ok(ApiResponse.success("에셋 목록 조회 성공", assets));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AssetResponse>> createAsset(
            @PathVariable String studioId,
            @Valid @RequestBody CreateAssetRequest request) {

        log.debug("에셋 생성: studioId={}, type={}, name={}", studioId, request.getType(), request.getName());

        AssetResponse asset = assetService.createAsset(studioId, request);

        return ResponseEntity.ok(ApiResponse.success("에셋 생성 성공", asset));
    }

    @DeleteMapping("/{assetId}")
    public ResponseEntity<ApiResponse<Void>> deleteAsset(
            @PathVariable String studioId,
            @PathVariable Long assetId) {

        log.debug("에셋 삭제: studioId={}, assetId={}", studioId, assetId);

        assetService.deleteAsset(studioId, assetId);

        return ResponseEntity.ok(ApiResponse.success("에셋 삭제 성공"));
    }
}
