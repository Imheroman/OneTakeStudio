package com.onetake.core.favorite.service;

import com.onetake.core.favorite.dto.*;
import com.onetake.core.favorite.entity.Favorite;
import com.onetake.core.favorite.entity.FavoriteRequest;
import com.onetake.core.favorite.entity.FavoriteRequest.RequestStatus;
import com.onetake.core.favorite.repository.FavoriteRepository;
import com.onetake.core.favorite.repository.FavoriteRequestRepository;
import com.onetake.core.notification.entity.Notification;
import com.onetake.core.notification.service.NotificationService;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.exception.UserNotFoundException;
import com.onetake.core.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private static final int MAX_FAVORITES = 10;

    private final FavoriteRepository favoriteRepository;
    private final FavoriteRequestRepository favoriteRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EntityManager entityManager;

    /**
     * 즐겨찾기 목록 조회
     */
    @Transactional(readOnly = true)
    public FavoriteListResponse getFavorites(String ownerUserId) {
        User owner = findUserByUserId(ownerUserId);
        List<Favorite> favorites = favoriteRepository.findAllByOwnerWithTarget(owner);

        List<FavoriteResponse> responses = favorites.stream()
                .map(FavoriteResponse::from)
                .toList();

        return FavoriteListResponse.of(responses, MAX_FAVORITES);
    }

    /**
     * 즐겨찾기 요청 보내기 (기존 addFavorite 대체)
     */
    @Transactional
    public AddFavoriteResponse sendFavoriteRequest(String requesterUserId, AddFavoriteRequest request) {
        User requester = findUserByUserId(requesterUserId);
        User target = findUserByUserId(request.getUserId());

        // 자기 자신에게 요청할 수 없음
        if (requester.getUserId().equals(target.getUserId())) {
            throw new IllegalArgumentException("자기 자신에게 즐겨찾기 요청을 보낼 수 없습니다.");
        }

        // 이미 즐겨찾기에 추가된 사용자인지 확인
        if (favoriteRepository.existsByOwnerAndTarget(requester, target)) {
            throw new IllegalArgumentException("이미 즐겨찾기에 추가된 사용자입니다.");
        }

        // 이미 대기중인 요청이 있는지 확인
        if (favoriteRequestRepository.existsByRequesterAndTargetAndStatus(requester, target, RequestStatus.PENDING)) {
            throw new IllegalArgumentException("이미 요청을 보냈습니다. 상대방의 수락을 기다려주세요.");
        }

        // 거절된 이전 요청이 있으면 삭제 (재요청 허용)
        Optional<FavoriteRequest> existingRequest = favoriteRequestRepository.findByRequesterAndTarget(requester, target);
        if (existingRequest.isPresent()) {
            favoriteRequestRepository.delete(existingRequest.get());
            entityManager.flush(); // 삭제 즉시 반영
        }

        // 최대 개수 체크
        long currentCount = favoriteRepository.countByOwner(requester);
        if (currentCount >= MAX_FAVORITES) {
            throw new IllegalArgumentException("즐겨찾기는 최대 " + MAX_FAVORITES + "명까지 추가할 수 있습니다.");
        }

        // 요청 생성
        FavoriteRequest favoriteRequest = FavoriteRequest.create(requester, target);
        favoriteRequestRepository.save(favoriteRequest);

        // 알림 생성
        Notification notification = Notification.createFriendRequest(target, requester, favoriteRequest.getRequestId());
        notificationService.createNotification(notification);

        return AddFavoriteResponse.of("즐겨찾기 요청을 보냈습니다.", null);
    }

    /**
     * 받은 즐겨찾기 요청 목록 조회
     */
    @Transactional(readOnly = true)
    public List<FavoriteRequestResponse> getPendingRequests(String targetUserId) {
        User target = findUserByUserId(targetUserId);
        List<FavoriteRequest> requests = favoriteRequestRepository.findAllByTargetAndStatusWithRequester(target, RequestStatus.PENDING);

        return requests.stream()
                .map(FavoriteRequestResponse::from)
                .toList();
    }

    /**
     * 즐겨찾기 요청 수락
     */
    @Transactional
    public void acceptRequest(String targetUserId, String requestId) {
        User target = findUserByUserId(targetUserId);
        FavoriteRequest request = favoriteRequestRepository.findByRequestId(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다."));

        // 요청 대상이 본인인지 확인
        if (!request.getTarget().getUserId().equals(targetUserId)) {
            throw new IllegalArgumentException("이 요청을 수락할 권한이 없습니다.");
        }

        // 이미 처리된 요청인지 확인
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalArgumentException("이미 처리된 요청입니다.");
        }

        request.accept();

        // 요청자의 즐겨찾기에 대상 추가
        Favorite favorite = Favorite.create(request.getRequester(), target);
        favoriteRepository.save(favorite);

        // 알림 삭제
        notificationService.deleteByReferenceId(requestId);
    }

    /**
     * 즐겨찾기 요청 거절
     */
    @Transactional
    public void declineRequest(String targetUserId, String requestId) {
        FavoriteRequest request = favoriteRequestRepository.findByRequestId(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다."));

        // 요청 대상이 본인인지 확인
        if (!request.getTarget().getUserId().equals(targetUserId)) {
            throw new IllegalArgumentException("이 요청을 거절할 권한이 없습니다.");
        }

        // 이미 처리된 요청인지 확인
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalArgumentException("이미 처리된 요청입니다.");
        }

        request.decline();

        // 알림 삭제
        notificationService.deleteByReferenceId(requestId);
    }

    /**
     * 즐겨찾기 삭제
     */
    @Transactional
    public void deleteFavorite(String ownerUserId, String targetUserId) {
        User owner = findUserByUserId(ownerUserId);

        List<Favorite> favorites = favoriteRepository.findAllByOwnerWithTarget(owner);
        Favorite favorite = favorites.stream()
                .filter(f -> f.getTarget().getUserId().equals(targetUserId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("즐겨찾기에 등록되지 않은 사용자입니다."));

        favoriteRepository.delete(favorite);
    }

    private User findUserByUserId(String userId) {
        return userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
    }
}
