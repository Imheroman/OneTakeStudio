package com.onetake.core.studio.repository;

import com.onetake.core.studio.entity.AssetType;
import com.onetake.core.studio.entity.StudioAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudioAssetRepository extends JpaRepository<StudioAsset, Long> {

    List<StudioAsset> findByStudioIdOrderBySortOrderAsc(Long studioId);

    List<StudioAsset> findByStudioIdAndTypeOrderBySortOrderAsc(Long studioId, AssetType type);

    Optional<StudioAsset> findByAssetId(String assetId);

    Optional<StudioAsset> findByIdAndStudioId(Long id, Long studioId);

    void deleteByIdAndStudioId(Long id, Long studioId);

    long countByStudioId(Long studioId);
}
