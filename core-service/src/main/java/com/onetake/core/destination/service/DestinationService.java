package com.onetake.core.destination.service;

import com.onetake.core.destination.dto.CreateDestinationRequest;
import com.onetake.core.destination.dto.DestinationResponse;
import com.onetake.core.destination.dto.UpdateDestinationRequest;
import com.onetake.core.destination.entity.ConnectedDestination;
import com.onetake.core.destination.exception.DestinationException;
import com.onetake.core.destination.repository.ConnectedDestinationRepository;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.exception.UserNotFoundException;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DestinationService {

    private final ConnectedDestinationRepository destinationRepository;
    private final UserRepository userRepository;

    private static final int MAX_DESTINATIONS = 10;

    @Transactional
    public DestinationResponse createDestination(String userId, CreateDestinationRequest request) {
        User user = findUserByUserId(userId);

        if (destinationRepository.existsByUserIdAndPlatformAndChannelId(
                user.getId(), request.getPlatform(), request.getChannelId())) {
            throw DestinationException.alreadyExists();
        }

        long activeCount = destinationRepository.findByUserIdAndIsActiveTrue(user.getId()).size();
        if (activeCount >= MAX_DESTINATIONS) {
            throw DestinationException.limitExceeded();
        }

        ConnectedDestination destination = ConnectedDestination.builder()
                .userId(user.getId())
                .platform(request.getPlatform())
                .channelId(request.getChannelId())
                .channelName(request.getChannelName())
                .rtmpUrl(request.getStreamUrl())
                .streamKey(request.getStreamKey())
                .build();

        destinationRepository.save(destination);
        return DestinationResponse.from(destination);
    }

    @Transactional(readOnly = true)
    public List<DestinationResponse> getMyDestinations(String userId) {
        User user = findUserByUserId(userId);

        return destinationRepository.findByUserIdAndIsActiveTrue(user.getId()).stream()
                .map(DestinationResponse::from)
                .toList();
    }

    @Transactional
    public DestinationResponse updateDestination(String userId, String destinationId, UpdateDestinationRequest request) {
        User user = findUserByUserId(userId);

        ConnectedDestination destination = destinationRepository.findByDestinationId(destinationId)
                .orElseThrow(DestinationException::notFound);

        if (!destination.getUserId().equals(user.getId())) {
            throw DestinationException.notFound();
        }

        if (request.getChannelName() != null) {
            destination.updateChannelInfo(destination.getChannelId(), request.getChannelName());
        }
        if (request.getStreamUrl() != null || request.getStreamKey() != null) {
            destination.updateStreamInfo(
                    request.getStreamUrl() != null ? request.getStreamUrl() : destination.getRtmpUrl(),
                    request.getStreamKey() != null ? request.getStreamKey() : destination.getStreamKey()
            );
        }

        return DestinationResponse.from(destination);
    }

    @Transactional
    public void deleteDestination(String userId, String destinationId) {
        User user = findUserByUserId(userId);

        ConnectedDestination destination = destinationRepository.findByDestinationId(destinationId)
                .orElseThrow(DestinationException::notFound);

        if (!destination.getUserId().equals(user.getId())) {
            throw DestinationException.notFound();
        }

        destination.deactivate();
    }

    private User findUserByUserId(String userId) {
        return userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
    }
}
