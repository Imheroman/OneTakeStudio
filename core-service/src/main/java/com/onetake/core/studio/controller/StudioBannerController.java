package com.onetake.core.studio.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.studio.dto.BannerResponse;
import com.onetake.core.studio.dto.CreateBannerRequest;
import com.onetake.core.studio.service.StudioBannerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/studios/{studioId}/banners")
@RequiredArgsConstructor
public class StudioBannerController {

    private final StudioBannerService bannerService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BannerResponse>>> getBanners(
            @PathVariable String studioId) {

        log.debug("배너 목록 조회: studioId={}", studioId);

        List<BannerResponse> banners = bannerService.getBanners(studioId);

        return ResponseEntity.ok(ApiResponse.success("배너 목록 조회 성공", banners));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BannerResponse>> createBanner(
            @PathVariable String studioId,
            @Valid @RequestBody CreateBannerRequest request) {

        log.debug("배너 생성: studioId={}, text={}", studioId, request.getText());

        BannerResponse banner = bannerService.createBanner(studioId, request);

        return ResponseEntity.ok(ApiResponse.success("배너 생성 성공", banner));
    }

    @DeleteMapping("/{bannerId}")
    public ResponseEntity<ApiResponse<Void>> deleteBanner(
            @PathVariable String studioId,
            @PathVariable Long bannerId) {

        log.debug("배너 삭제: studioId={}, bannerId={}", studioId, bannerId);

        bannerService.deleteBanner(studioId, bannerId);

        return ResponseEntity.ok(ApiResponse.success("배너 삭제 성공"));
    }
}
