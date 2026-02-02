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

    public List<AssetResponse> getAssets(Long studioId) {
        validateStudioExists(studioId);
        return assetRepository.findByStudioIdOrderBySortOrderAsc(studioId).stream()
                .map(AssetResponse::from)
                .toList();
    }

    public List<AssetResponse> getAssetsByType(Long studioId, String type) {
        validateStudioExists(studioId);
        AssetType assetType = parseAssetType(type);
        return assetRepository.findByStudioIdAndTypeOrderBySortOrderAsc(studioId, assetType).stream()
                .map(AssetResponse::from)
                .toList();
    }

    @Transactional
    public AssetResponse createAsset(Long studioId, CreateAssetRequest request) {
        validateStudioExists(studioId);

        AssetType assetType = parseAssetType(request.getType());

        StudioAsset asset = StudioAsset.builder()
                .studioId(studioId)
                .type(assetType)
                .name(request.getName())
                .fileUrl(request.getFileUrl())
                .sortOrder((int) assetRepository.countByStudioId(studioId))
                .build();

        assetRepository.save(asset);

        log.info("Asset created: studioId={}, assetId={}, type={}", studioId, asset.getAssetId(), assetType);

        return AssetResponse.from(asset);
    }

    @Transactional
    public void deleteAsset(Long studioId, Long assetId) {
        validateStudioExists(studioId);

        StudioAsset asset = assetRepository.findByIdAndStudioId(assetId, studioId)
                .orElseThrow(() -> new AssetNotFoundException(assetId));

        assetRepository.delete(asset);

        log.info("Asset deleted: studioId={}, assetId={}", studioId, assetId);
    }

    private void validateStudioExists(Long studioId) {
        if (!studioRepository.existsById(studioId)) {
            throw new StudioNotFoundException(studioId);
        }
    }

    private AssetType parseAssetType(String type) {
        try {
            return AssetType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid asset type: " + type + ". Must be one of: logo, overlay, video");
        }
    }
}
