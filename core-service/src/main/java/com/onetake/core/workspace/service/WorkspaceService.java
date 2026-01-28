package com.onetake.core.workspace.service;

import com.onetake.core.destination.repository.ConnectedDestinationRepository;
import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.repository.StudioRepository;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.exception.UserNotFoundException;
import com.onetake.core.user.repository.UserRepository;
import com.onetake.core.workspace.dto.DashboardResponse;
import com.onetake.core.workspace.dto.RecentStudioListResponse;
import com.onetake.core.workspace.dto.RecentStudioResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final StudioRepository studioRepository;
    private final ConnectedDestinationRepository connectedDestinationRepository;
    private final UserRepository userRepository;

    private static final int RECENT_STUDIO_LIMIT = 10;

    @Transactional(readOnly = true)
    public RecentStudioListResponse getRecentStudios(String userId) {
        User user = findUserByUserId(userId);

        List<Studio> studios = studioRepository.findByOwnerId(user.getId());

        List<RecentStudioResponse> studioList = studios.stream()
                .limit(RECENT_STUDIO_LIMIT)
                .map(RecentStudioResponse::from)
                .toList();

        return new RecentStudioListResponse(studioList);
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(String userId) {
        User user = findUserByUserId(userId);

        RecentStudioListResponse recentStudios = getRecentStudios(userId);
        long connectedDestinationCount = connectedDestinationRepository.findByUserIdAndIsActiveTrue(user.getId()).size();
        long totalStudioCount = studioRepository.findByOwnerId(user.getId()).size();

        return DashboardResponse.builder()
                .recentStudios(recentStudios.getStudios())
                .connectedDestinationCount(connectedDestinationCount)
                .totalStudioCount(totalStudioCount)
                .build();
    }

    private User findUserByUserId(String userId) {
        return userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
    }
}
