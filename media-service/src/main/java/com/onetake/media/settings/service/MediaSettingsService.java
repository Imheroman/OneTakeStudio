package com.onetake.media.settings.service;

import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import com.onetake.media.settings.dto.MediaStateUpdateRequest;
import com.onetake.media.settings.dto.SessionMediaStateResponse;
import com.onetake.media.settings.dto.UserMediaSettingsRequest;
import com.onetake.media.settings.dto.UserMediaSettingsResponse;
import com.onetake.media.settings.entity.SessionMediaState;
import com.onetake.media.settings.entity.UserMediaSettings;
import com.onetake.media.settings.repository.SessionMediaStateRepository;
import com.onetake.media.settings.repository.UserMediaSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MediaSettingsService {

    private final UserMediaSettingsRepository userMediaSettingsRepository;
    private final SessionMediaStateRepository sessionMediaStateRepository;

    // ===================== User Media Settings =====================

    @Transactional
    public UserMediaSettingsResponse getUserSettings(Long userId) {
        UserMediaSettings settings = userMediaSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserMediaSettings newSettings = UserMediaSettings.builder()
                            .userId(userId)
                            .build();
                    return userMediaSettingsRepository.save(newSettings);
                });
        return UserMediaSettingsResponse.from(settings);
    }

    @Transactional
    public UserMediaSettingsResponse saveUserSettings(Long userId, UserMediaSettingsRequest request) {
        UserMediaSettings settings = userMediaSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserMediaSettings newSettings = UserMediaSettings.builder()
                            .userId(userId)
                            .build();
                    return userMediaSettingsRepository.save(newSettings);
                });

        settings.updateSettings(
                request.getDefaultVideoDeviceId(),
                request.getVideoQuality(),
                request.getDefaultAudioInputDeviceId(),
                request.getDefaultAudioOutputDeviceId(),
                request.getAudioQuality(),
                request.getNoiseCancellationEnabled(),
                request.getEchoCancellationEnabled(),
                request.getDefaultVolumeLevel()
        );

        UserMediaSettings saved = userMediaSettingsRepository.save(settings);
        log.info("User media settings saved: userId={}", userId);
        return UserMediaSettingsResponse.from(saved);
    }

    // ===================== Session Media State =====================

    @Transactional
    public SessionMediaStateResponse initializeSessionState(Long userId, String studioId, Long streamSessionId) {
        // 유니크 제약 (studio_id, user_id, is_active): (1,1,false) 행은 하나만 허용되므로
        // 기존 활성 행을 is_active=false로 바꾸면 이미 있는 false 행과 충돌함. 따라서 기존 활성 행은 삭제.
        sessionMediaStateRepository.findByStudioIdAndUserIdAndIsActiveTrue(studioId, userId)
                .ifPresent(existing -> {
                    sessionMediaStateRepository.delete(existing);
                    sessionMediaStateRepository.flush(); // delete가 먼저 실행되도록 강제
                });

        // 사용자 설정 가져오기
        UserMediaSettings userSettings = userMediaSettingsRepository.findByUserId(userId)
                .orElse(null);

        // 새 세션 상태 생성
        SessionMediaState state = SessionMediaState.builder()
                .streamSessionId(streamSessionId)
                .userId(userId)
                .studioId(studioId)
                .videoEnabled(true)
                .audioEnabled(true)
                .currentVideoDeviceId(userSettings != null ? userSettings.getDefaultVideoDeviceId() : null)
                .currentAudioInputDeviceId(userSettings != null ? userSettings.getDefaultAudioInputDeviceId() : null)
                .currentAudioOutputDeviceId(userSettings != null ? userSettings.getDefaultAudioOutputDeviceId() : null)
                .currentVolumeLevel(userSettings != null ? userSettings.getDefaultVolumeLevel() : 80)
                .isMuted(false)
                .isActive(true)
                .build();

        SessionMediaState saved = sessionMediaStateRepository.save(state);
        log.info("Session media state initialized: studioId={}, userId={}, stateId={}",
                studioId, userId, saved.getStateId());
        return SessionMediaStateResponse.from(saved);
    }

    public SessionMediaStateResponse getSessionState(String studioId, Long userId) {
        SessionMediaState state = sessionMediaStateRepository
                .findByStudioIdAndUserIdAndIsActiveTrue(studioId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEDIA_STATE_NOT_FOUND));
        return SessionMediaStateResponse.from(state);
    }

    @Transactional
    public SessionMediaStateResponse updateSessionState(Long userId, MediaStateUpdateRequest request) {
        SessionMediaState state = sessionMediaStateRepository
                .findByStudioIdAndUserIdAndIsActiveTrue(request.getStudioId(), userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEDIA_STATE_NOT_FOUND));

        state.updateState(
                request.getVideoEnabled(),
                request.getAudioEnabled(),
                request.getCurrentVideoDeviceId(),
                request.getCurrentAudioInputDeviceId(),
                request.getCurrentAudioOutputDeviceId(),
                request.getCurrentVolumeLevel(),
                request.getIsMuted()
        );

        SessionMediaState saved = sessionMediaStateRepository.save(state);
        log.info("Session media state updated: studioId={}, userId={}", request.getStudioId(), userId);
        return SessionMediaStateResponse.from(saved);
    }

    @Transactional
    public SessionMediaStateResponse toggleVideo(String studioId, Long userId) {
        SessionMediaState state = sessionMediaStateRepository
                .findByStudioIdAndUserIdAndIsActiveTrue(studioId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEDIA_STATE_NOT_FOUND));

        state.toggleVideo();
        SessionMediaState saved = sessionMediaStateRepository.save(state);
        log.info("Video toggled: studioId={}, userId={}, videoEnabled={}", studioId, userId, saved.getVideoEnabled());
        return SessionMediaStateResponse.from(saved);
    }

    @Transactional
    public SessionMediaStateResponse toggleAudio(String studioId, Long userId) {
        SessionMediaState state = sessionMediaStateRepository
                .findByStudioIdAndUserIdAndIsActiveTrue(studioId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEDIA_STATE_NOT_FOUND));

        state.toggleAudio();
        SessionMediaState saved = sessionMediaStateRepository.save(state);
        log.info("Audio toggled: studioId={}, userId={}, audioEnabled={}", studioId, userId, saved.getAudioEnabled());
        return SessionMediaStateResponse.from(saved);
    }

    @Transactional
    public SessionMediaStateResponse toggleMute(String studioId, Long userId) {
        SessionMediaState state = sessionMediaStateRepository
                .findByStudioIdAndUserIdAndIsActiveTrue(studioId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEDIA_STATE_NOT_FOUND));

        state.toggleMute();
        SessionMediaState saved = sessionMediaStateRepository.save(state);
        log.info("Mute toggled: studioId={}, userId={}, isMuted={}", studioId, userId, saved.getIsMuted());
        return SessionMediaStateResponse.from(saved);
    }

    public List<SessionMediaStateResponse> getParticipantsState(String studioId) {
        return sessionMediaStateRepository.findByStudioIdAndIsActiveTrue(studioId).stream()
                .map(SessionMediaStateResponse::from)
                .toList();
    }

    @Transactional
    public void terminateSessionState(String studioId, Long userId) {
        sessionMediaStateRepository.findByStudioIdAndUserIdAndIsActiveTrue(studioId, userId)
                .ifPresent(state -> {
                    sessionMediaStateRepository.delete(state);
                    log.info("Session media state terminated (deleted): studioId={}, userId={}", studioId, userId);
                });
    }
}
