package com.onetake.core.studio.service;

import com.onetake.core.studio.dto.AssetResponse;
import com.onetake.core.studio.dto.CreateAssetRequest;
import com.onetake.core.studio.entity.AssetType;
import com.onetake.core.studio.entity.StudioAsset;
import com.onetake.core.studio.exception.AssetNotFoundException;
import com.onetake.core.studio.exception.StudioNotFoundException;
import com.onetake.core.studio.repository.StudioAssetRepository;
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
public class StudioAssetService {

    private final StudioAssetRepository assetRepository;
    private final StudioRepository studioRepository;

    public List<AssetResponse> getAssets(String studioId) {
        Long internalStudioId = getInternalStudioId(studioId);
        return assetRepository.findByStudioIdOrderBySortOrderAsc(internalStudioId).stream()
                .map(AssetResponse::from)
                .toList();
    }

    public List<AssetResponse> getAssetsByType(String studioId, String type) {
        Long internalStudioId = getInternalStudioId(studioId);
        AssetType assetType = parseAssetType(type);
        return assetRepository.findByStudioIdAndTypeOrderBySortOrderAsc(internalStudioId, assetType).stream()
                .map(AssetResponse::from)
                .toList();
    }

    @Transactional
    public AssetResponse createAsset(String studioId, CreateAssetRequest request) {
        Long internalStudioId = getInternalStudioId(studioId);

        AssetType assetType = parseAssetType(request.getType());

        StudioAsset asset = StudioAsset.builder()
                .studioId(internalStudioId)
                .type(assetType)
                .name(request.getName())
                .fileUrl(request.getFileUrl())
                .sortOrder((int) assetRepository.countByStudioId(internalStudioId))
                .build();

        assetRepository.save(asset);

        log.info("Asset created: studioId={}, assetId={}, type={}", studioId, asset.getAssetId(), assetType);

        return AssetResponse.from(asset);
    }

    @Transactional
    public void deleteAsset(String studioId, Long assetId) {
        Long internalStudioId = getInternalStudioId(studioId);

        StudioAsset asset = assetRepository.findByIdAndStudioId(assetId, internalStudioId)
                .orElseThrow(() -> new AssetNotFoundException(assetId));

        assetRepository.delete(asset);

        log.info("Asset deleted: studioId={}, assetId={}", studioId, assetId);
    }

    private Long getInternalStudioId(String studioId) {
        return studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId))
                .getId();
    }

    private AssetType parseAssetType(String type) {
        try {
            return AssetType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid asset type: " + type + ". Must be one of: logo, overlay, video");
        }
    }
}
