package com.onetake.core.studio.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.core.studio.dto.CreateSceneRequest;
import com.onetake.core.studio.dto.SceneResponse;
import com.onetake.core.studio.dto.UpdateSceneRequest;
import com.onetake.core.studio.entity.Scene;
import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.entity.StudioMember;
import com.onetake.core.studio.exception.SceneNotFoundException;
import com.onetake.core.studio.exception.StudioAccessDeniedException;
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
public class SceneService {

    private final StudioRepository studioRepository;
    private final StudioMemberRepository studioMemberRepository;
    private final SceneRepository sceneRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private Long getInternalUserId(String externalUserId) {
        User user = userRepository.findByUserId(externalUserId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
        return user.getId();
    }

    public List<SceneResponse> getScenes(String userId, String studioId) {
        log.debug("씬 목록 조회: studioId={}", studioId);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        validateMemberAccess(studio.getId(), internalUserId);

        return sceneRepository.findByStudioIdOrderBySortOrderAsc(studio.getId()).stream()
                .map(SceneResponse::from)
                .toList();
    }

    @Transactional
    public SceneResponse createScene(String userId, String studioId, CreateSceneRequest request) {
        log.debug("씬 생성 요청: studioId={}, name={}", studioId, request.getName());
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        validateHostOrManagerAccess(studio.getId(), internalUserId);

        int nextSortOrder = sceneRepository.countByStudioId(studio.getId());

        String layoutJson = null;
        if (request.getLayout() != null) {
            try {
                layoutJson = objectMapper.writeValueAsString(request.getLayout());
            } catch (JsonProcessingException e) {
                log.warn("레이아웃 JSON 변환 실패: {}", e.getMessage());
            }
        }

        Scene scene = Scene.builder()
                .studioId(studio.getId())
                .name(request.getName())
                .sortOrder(nextSortOrder)
                .layout(layoutJson)
                .build();

        Scene saved = sceneRepository.save(scene);
        log.info("씬 생성 완료: sceneId={}", saved.getId());

        return SceneResponse.from(saved);
    }

    @Transactional
    public SceneResponse updateScene(String userId, String studioId, Long sceneId, UpdateSceneRequest request) {
        log.debug("씬 수정 요청: studioId={}, sceneId={}", studioId, sceneId);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        validateHostOrManagerAccess(studio.getId(), internalUserId);

        Scene scene = sceneRepository.findById(sceneId)
                .orElseThrow(() -> new SceneNotFoundException(sceneId));

        if (!scene.getStudioId().equals(studio.getId())) {
            throw new SceneNotFoundException(sceneId);
        }

        String layoutJson = null;
        if (request.getLayout() != null) {
            try {
                layoutJson = objectMapper.writeValueAsString(request.getLayout());
            } catch (JsonProcessingException e) {
                log.warn("레이아웃 JSON 변환 실패: {}", e.getMessage());
            }
        }

        scene.update(request.getName(), layoutJson);
        scene.updateSortOrder(request.getSortOrder());
        log.info("씬 수정 완료: sceneId={}", sceneId);

        return SceneResponse.from(scene);
    }

    @Transactional
    public void deleteScene(String userId, String studioId, Long sceneId) {
        log.debug("씬 삭제 요청: studioId={}, sceneId={}", studioId, sceneId);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        validateHostOrManagerAccess(studio.getId(), internalUserId);

        Scene scene = sceneRepository.findById(sceneId)
                .orElseThrow(() -> new SceneNotFoundException(sceneId));

        if (!scene.getStudioId().equals(studio.getId())) {
            throw new SceneNotFoundException(sceneId);
        }

        sceneRepository.delete(scene);
        log.info("씬 삭제 완료: sceneId={}", sceneId);
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
            throw new StudioAccessDeniedException("호스트 또는 매니저만 수행할 수 있습니다.");
        }
    }
}
