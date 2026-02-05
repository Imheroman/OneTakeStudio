package com.onetake.core.studio.repository;

import com.onetake.core.studio.entity.StudioBanner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudioBannerRepository extends JpaRepository<StudioBanner, Long> {

    List<StudioBanner> findByStudioIdOrderBySortOrderAsc(Long studioId);

    Optional<StudioBanner> findByBannerId(String bannerId);

    Optional<StudioBanner> findByIdAndStudioId(Long id, Long studioId);

    long countByStudioId(Long studioId);
}
