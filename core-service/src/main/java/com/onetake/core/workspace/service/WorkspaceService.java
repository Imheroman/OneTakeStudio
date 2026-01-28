package com.onetake.core.workspace.service;

import com.onetake.core.destination.repository.ConnectedDestinationRepository;
import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.repository.StudioMemberRepository;
import com.onetake.core.studio.repository.StudioRepository;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.exception.UserNotFoundException;
import com.onetake.core.user.repository.UserRepository;
import com.onetake.core.workspace.dto.DashboardResponse;
import com.onetake.core.workspace.dto.RecentStudioResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final StudioRepository studioRepository;
    private final StudioMemberRepository studioMemberRepository;
    private final ConnectedDestinationRepository connectedDestinationRepository;
    private final UserRepository userRepository;

    private static final int RECENT_STUDIO_LIMIT = 10;

    @Transactional(readOnly = true)
    public List<RecentStudioResponse> getRecentStudios(String userId) {
        User user = findUserByUserId(userId);

        List<Studio> studios = studioRepository.findByOwnerId(user.getId());

        return studios.stream()
                .limit(RECENT_STUDIO_LIMIT)
                .map(studio -> {
                    long memberCount = studioMemberRepository.findByStudioId(studio.getId()).size();
                    return RecentStudioResponse.from(studio, memberCount);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(String userId) {
        User user = findUserByUserId(userId);

        List<RecentStudioResponse> recentStudios = getRecentStudios(userId);
        long connectedDestinationCount = connectedDestinationRepository.findByUserIdAndIsActiveTrue(user.getId()).size();
        long totalStudioCount = studioRepository.findByOwnerId(user.getId()).size();

        return DashboardResponse.builder()
                .recentStudios(recentStudios)
                .connectedDestinationCount(connectedDestinationCount)
                .totalStudioCount(totalStudioCount)
                .build();
    }

    private User findUserByUserId(String userId) {
        return userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
    }
}
