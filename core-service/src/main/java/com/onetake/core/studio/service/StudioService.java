package com.onetake.core.studio.service;

import com.onetake.core.studio.dto.*;
import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.entity.StudioMember;
import com.onetake.core.studio.entity.StudioMemberRole;
import com.onetake.core.studio.exception.StudioAccessDeniedException;
import com.onetake.core.studio.exception.StudioInUseException;
import com.onetake.core.studio.exception.StudioNotFoundException;
import com.onetake.core.studio.repository.SceneRepository;
import com.onetake.core.studio.repository.StudioMemberRepository;
import com.onetake.core.studio.repository.StudioRepository;
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
public class StudioService {

    private final StudioRepository studioRepository;
    private final StudioMemberRepository studioMemberRepository;
    private final SceneRepository sceneRepository;
    private final UserRepository userRepository;

    private Long getInternalUserId(String externalUserId) {
        User user = userRepository.findByUserId(externalUserId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
        return user.getId();
    }

    @Transactional
    public StudioDetailResponse createStudio(String userId, CreateStudioRequest request) {
        String studioName = request.getEffectiveName();
        if (studioName == null || studioName.isBlank()) {
            throw new IllegalArgumentException("스튜디오 이름(name 또는 title)은 필수입니다.");
        }

        log.debug("스튜디오 생성 요청: userId={}, name={}", userId, studioName);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = Studio.builder()
                .ownerId(internalUserId)
                .name(studioName)
                .description(request.getDescription())
                .template(request.getTemplate())
                .build();

        Studio saved = studioRepository.save(studio);
        log.info("스튜디오 생성 완료: studioId={}", saved.getId());

        StudioMember hostMember = StudioMember.builder()
                .studioId(saved.getId())
                .userId(internalUserId)
                .role(StudioMemberRole.HOST)
                .build();
        studioMemberRepository.save(hostMember);

        return StudioDetailResponse.from(saved);
    }

    public List<StudioResponse> getMyStudios(String userId) {
        log.debug("내 스튜디오 목록 조회: userId={}", userId);
        Long internalUserId = getInternalUserId(userId);

        List<Long> studioIds = studioMemberRepository.findStudioIdsByUserId(internalUserId);

        return studioRepository.findAllById(studioIds).stream()
                .map(StudioResponse::from)
                .toList();
    }

    public StudioDetailResponse getStudioDetail(String userId, Long studioId) {
        log.debug("스튜디오 상세 조회: userId={}, studioId={}", userId, studioId);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findById(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        validateMemberAccess(studio.getId(), internalUserId);

        List<StudioMemberResponse> members = getMemberResponses(studio.getId());
        List<SceneResponse> scenes = sceneRepository.findByStudioIdOrderBySortOrderAsc(studio.getId()).stream()
                .map(SceneResponse::from)
                .toList();

        return StudioDetailResponse.from(studio, members, scenes);
    }

    @Transactional
    public StudioDetailResponse updateStudio(String userId, Long studioId, UpdateStudioRequest request) {
        log.debug("스튜디오 수정 요청: userId={}, studioId={}", userId, studioId);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findById(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        validateHostOrManagerAccess(studio.getId(), internalUserId);

        studio.updateInfo(request.getName(), request.getThumbnail());
        log.info("스튜디오 수정 완료: studioId={}", studioId);

        return StudioDetailResponse.from(studio);
    }

    @Transactional
    public void deleteStudio(String userId, Long studioId) {
        log.debug("스튜디오 삭제 요청: userId={}, studioId={}", userId, studioId);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findById(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        if (!studio.getOwnerId().equals(internalUserId)) {
            throw new StudioAccessDeniedException("스튜디오 소유자만 삭제할 수 있습니다.");
        }

        if (studio.isStreaming()) {
            throw new StudioInUseException("스트리밍 중인 스튜디오는 삭제할 수 없습니다.");
        }

        sceneRepository.deleteByStudioId(studio.getId());
        studioMemberRepository.findByStudioId(studio.getId())
                .forEach(member -> studioMemberRepository.delete(member));
        studioRepository.delete(studio);

        log.info("스튜디오 삭제 완료: studioId={}", studioId);
    }

    private void validateMemberAccess(Long studioId, Long userId) {
        if (!studioMemberRepository.existsByStudioIdAndUserId(studioId, userId)) {
            throw new StudioAccessDeniedException();
        }
    }

    private void validateHostOrManagerAccess(Long studioId, Long userId) {
        StudioMember member = studioMemberRepository.findByStudioIdAndUserId(studioId, userId)
                .orElseThrow(StudioAccessDeniedException::new);

        if (!member.canManageMembers()) {
            throw new StudioAccessDeniedException("호스트 또는 매니저만 수정할 수 있습니다.");
        }
    }

    private List<StudioMemberResponse> getMemberResponses(Long studioId) {
        return studioMemberRepository.findByStudioId(studioId).stream()
                .map(member -> {
                    User user = userRepository.findById(member.getUserId()).orElse(null);
                    if (user != null) {
                        return StudioMemberResponse.from(member, user.getNickname(), user.getEmail(), user.getProfileImageUrl());
                    }
                    return StudioMemberResponse.from(member);
                })
                .toList();
    }
}
