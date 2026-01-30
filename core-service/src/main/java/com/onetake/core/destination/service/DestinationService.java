package com.onetake.core.destination.service;

import com.onetake.core.destination.dto.CreateDestinationRequest;
import com.onetake.core.destination.dto.DestinationResponse;
import com.onetake.core.destination.dto.UpdateDestinationRequest;
import com.onetake.core.destination.entity.ConnectedDestination;
import com.onetake.core.destination.exception.DestinationNotFoundException;
import com.onetake.core.destination.repository.ConnectedDestinationRepository;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.exception.UserNotFoundException;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DestinationService {

    private final ConnectedDestinationRepository destinationRepository;
    private final UserRepository userRepository;

    private Long getInternalUserId(String externalUserId) {
        User user = userRepository.findByUserId(externalUserId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
        return user.getId();
    }

    public List<DestinationResponse> getMyDestinations(String userId) {
        Long internalUserId = getInternalUserId(userId);
        return destinationRepository.findByUserIdAndIsActiveTrue(internalUserId).stream()
                .map(DestinationResponse::from)
                .toList();
    }

    private static String normalizePlatform(String platform) {
        return platform == null ? "" : platform.trim().toLowerCase();
    }

    private static String normalizeChannelId(String channelId) {
        return channelId == null ? "" : channelId.trim();
    }

    @Transactional
    public DestinationResponse createDestination(String userId, CreateDestinationRequest request) {
        String platform = normalizePlatform(request.getPlatform());
        String channelId = normalizeChannelId(request.getChannelId());
        Long internalUserId = getInternalUserId(userId);

        var alreadyActive = destinationRepository.findOneByUserIdAndPlatformAndChannelIdAndIsActiveTrue(
                internalUserId, platform, channelId);
        if (alreadyActive.isPresent()) {
            return DestinationResponse.from(alreadyActive.get());
        }

        var existing = destinationRepository.findByUserIdAndPlatformAndChannelId(
                internalUserId, platform, channelId);
        if (existing.isPresent()) {
            ConnectedDestination dest = existing.get();
            dest.activate();
            if (request.getChannelName() != null) dest.updateChannelInfo(dest.getChannelId(), request.getChannelName());
            if (request.getRtmpUrl() != null || request.getStreamKey() != null) {
                dest.updateStreamInfo(
                        request.getRtmpUrl() != null ? request.getRtmpUrl() : dest.getRtmpUrl(),
                        request.getStreamKey() != null ? request.getStreamKey() : dest.getStreamKey());
            }
            destinationRepository.save(dest);
            return DestinationResponse.from(dest);
        }

        ConnectedDestination destination = ConnectedDestination.builder()
                .userId(internalUserId)
                .platform(platform)
                .channelId(channelId)
                .channelName(request.getChannelName())
                .rtmpUrl(request.getRtmpUrl())
                .streamKey(request.getStreamKey())
                .isActive(true)
                .build();

        return DestinationResponse.from(destinationRepository.save(destination));
    }

    @Transactional
    public DestinationResponse updateDestination(String userId, String destinationId, UpdateDestinationRequest request) {
        Long internalUserId = getInternalUserId(userId);
        ConnectedDestination destination = findDestinationByIdAndUserId(destinationId, internalUserId);

        if (request.getChannelName() != null) {
            destination.updateChannelInfo(destination.getChannelId(), request.getChannelName());
        }
        if (request.getRtmpUrl() != null || request.getStreamKey() != null) {
            destination.updateStreamInfo(
                    request.getRtmpUrl() != null ? request.getRtmpUrl() : destination.getRtmpUrl(),
                    request.getStreamKey() != null ? request.getStreamKey() : destination.getStreamKey()
            );
        }
        return DestinationResponse.from(destination);
    }

    @Transactional
    public void deleteDestination(String userId, String destinationId) {
        Long internalUserId = getInternalUserId(userId);
        findDestinationByIdAndUserId(destinationId, internalUserId).deactivate();
    }

    public DestinationResponse getDestinationById(String userId, String destinationId) {
        Long internalUserId = getInternalUserId(userId);

        ConnectedDestination destination = findDestinationByIdAndUserId(destinationId, internalUserId);
        return DestinationResponse.from(destination);
    }

    public List<DestinationResponse> getDestinationsByIds(List<Long> ids) {
        return destinationRepository.findByIdInAndIsActiveTrue(ids).stream()
                .map(DestinationResponse::from)
                .toList();
    }

    private ConnectedDestination findDestinationByIdAndUserId(String destinationId, Long internalUserId) {
        ConnectedDestination destination = destinationRepository.findByDestinationId(destinationId)
                .orElseThrow(() -> new DestinationNotFoundException(destinationId));

        if (!destination.getUserId().equals(internalUserId)) {
            throw new DestinationNotFoundException(destinationId);
        }

        if (!destination.getIsActive()) {
            throw new DestinationNotFoundException(destinationId);
        }

        return destination;
    }
}
