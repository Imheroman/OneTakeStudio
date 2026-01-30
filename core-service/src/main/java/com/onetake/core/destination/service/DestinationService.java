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

    /**
     * 외부 UUID로 내부 Long ID 조회
     */
    private Long getInternalUserId(String externalUserId) {
        User user = userRepository.findByUserId(externalUserId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
        return user.getId();
    }

    /**
     * W12: 내 연동 채널 목록 조회
     */
    public List<DestinationResponse> getMyDestinations(String userId) {
        log.debug("사용자 {}의 연동 채널 목록 조회", userId);
        Long internalUserId = getInternalUserId(userId);

        var list = destinationRepository.findByUserIdAndIsActiveTrue(internalUserId).stream()
                .map(DestinationResponse::from)
                .toList();
        log.debug("연동 채널 목록 조회 결과: userId={}, internalUserId={}, count={}", userId, internalUserId, list.size());
        return list;
    }

    /** platform/channelId 정규화: DB·조회 일치 (대소문자/공백 차이 방지) */
    private static String normalizePlatform(String platform) {
        return platform == null ? "" : platform.trim().toLowerCase();
    }

    private static String normalizeChannelId(String channelId) {
        return channelId == null ? "" : channelId.trim();
    }

    /**
     * W13: 신규 송출 채널 등록 (연결 해제한 채널은 재활성화)
     */
    @Transactional
    public DestinationResponse createDestination(String userId, CreateDestinationRequest request) {
        String platform = normalizePlatform(request.getPlatform());
        String channelId = normalizeChannelId(request.getChannelId());
        log.debug("사용자 {}의 신규 채널 등록: {} - {}", userId, platform, channelId);
        Long internalUserId = getInternalUserId(userId);

        // 이미 등록된 활성 채널이면 409 대신 200 + 기존 데이터 반환 (목록 갱신·표기 일치)
        var alreadyActive = destinationRepository.findOneByUserIdAndPlatformAndChannelIdAndIsActiveTrue(
                internalUserId, platform, channelId);
        if (alreadyActive.isPresent()) {
            log.info("이미 등록된 채널 반환: userId={}, platform={}, channelId={}", userId, platform, channelId);
            return DestinationResponse.from(alreadyActive.get());
        }

        // 연결 해제 후 재등록: 기존 비활성 행이 있으면 재활성화 후 업데이트
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
            log.info("채널 재활성화 완료: destinationId={}", dest.getDestinationId());
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

        ConnectedDestination saved = destinationRepository.save(destination);
        log.info("신규 채널 등록 완료: destinationId={}", saved.getDestinationId());

        return DestinationResponse.from(saved);
    }

    /**
     * W14: 채널 정보 수정
     */
    @Transactional
    public DestinationResponse updateDestination(String userId, String destinationId, UpdateDestinationRequest request) {
        log.debug("채널 정보 수정: destinationId={}", destinationId);
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

        log.info("채널 정보 수정 완료: destinationId={}", destinationId);
        return DestinationResponse.from(destination);
    }

    /**
     * W14: 채널 연동 해제
     */
    @Transactional
    public void deleteDestination(String userId, String destinationId) {
        log.debug("채널 연동 해제: destinationId={}", destinationId);
        Long internalUserId = getInternalUserId(userId);

        ConnectedDestination destination = findDestinationByIdAndUserId(destinationId, internalUserId);
        destination.deactivate();

        log.info("채널 연동 해제 완료: destinationId={}", destinationId);
    }

    /**
     * 단일 채널 조회
     */
    public DestinationResponse getDestinationById(String userId, String destinationId) {
        log.debug("채널 조회: destinationId={}", destinationId);
        Long internalUserId = getInternalUserId(userId);

        ConnectedDestination destination = findDestinationByIdAndUserId(destinationId, internalUserId);
        return DestinationResponse.from(destination);
    }

    /**
     * 내부 서비스용: ID 목록으로 Destination 일괄 조회
     */
    public List<DestinationResponse> getDestinationsByIds(List<Long> ids) {
        log.debug("Destination 일괄 조회: ids={}", ids);

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
