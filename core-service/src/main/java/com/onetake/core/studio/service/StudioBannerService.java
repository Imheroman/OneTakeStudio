package com.onetake.core.studio.service;

import com.onetake.core.studio.dto.BannerResponse;
import com.onetake.core.studio.dto.CreateBannerRequest;
import com.onetake.core.studio.entity.StudioBanner;
import com.onetake.core.studio.exception.BannerNotFoundException;
import com.onetake.core.studio.exception.StudioNotFoundException;
import com.onetake.core.studio.repository.StudioBannerRepository;
import com.onetake.core.studio.repository.StudioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudioBannerService {

    private final StudioBannerRepository bannerRepository;
    private final StudioRepository studioRepository;

    public List<BannerResponse> getBanners(String studioId) {
        Long internalStudioId = getInternalStudioId(studioId);
        return bannerRepository.findByStudioIdOrderBySortOrderAsc(internalStudioId).stream()
                .map(banner -> BannerResponse.from(banner, studioId))
                .toList();
    }

    @Transactional
    public BannerResponse createBanner(String studioId, CreateBannerRequest request) {
        Long internalStudioId = getInternalStudioId(studioId);

        StudioBanner banner = StudioBanner.builder()
                .studioId(internalStudioId)
                .text(request.getText())
                .timerSeconds(request.getTimerSeconds())
                .isTicker(request.getIsTicker() != null ? request.getIsTicker() : false)
                .sortOrder((int) bannerRepository.countByStudioId(internalStudioId))
                .build();

        bannerRepository.save(banner);

        log.info("Banner created: studioId={}, bannerId={}", studioId, banner.getBannerId());

        return BannerResponse.from(banner, studioId);
    }

    @Transactional
    public void deleteBanner(String studioId, Long bannerId) {
        Long internalStudioId = getInternalStudioId(studioId);

        StudioBanner banner = bannerRepository.findByIdAndStudioId(bannerId, internalStudioId)
                .orElseThrow(() -> new BannerNotFoundException(bannerId));

        bannerRepository.delete(banner);

        log.info("Banner deleted: studioId={}, bannerId={}", studioId, bannerId);
    }

    private Long getInternalStudioId(String studioId) {
        return studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId))
                .getId();
    }
}
