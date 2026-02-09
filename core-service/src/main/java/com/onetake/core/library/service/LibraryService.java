package com.onetake.core.library.service;

import com.onetake.core.ai.repository.ShortsResultRepository;
import com.onetake.core.library.dto.*;
import com.onetake.core.library.entity.Clip;
import com.onetake.core.library.entity.ClipStatus;
import com.onetake.core.library.entity.Recording;
import com.onetake.core.library.entity.RecordingStatus;
import com.onetake.core.library.exception.RecordingAccessDeniedException;
import com.onetake.core.library.exception.RecordingNotFoundException;
import com.onetake.core.library.repository.ClipRepository;
import com.onetake.core.library.repository.RecordingRepository;
import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.exception.StudioNotFoundException;
import com.onetake.core.studio.repository.StudioRepository;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LibraryService {

    private final RecordingRepository recordingRepository;
    private final ClipRepository clipRepository;
    private final StudioRepository studioRepository;
    private final ShortsResultRepository shortsResultRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${library.storage.limit-bytes:10737418240}")
    private Long storageLimitBytes; // 기본 10GB

    @Value("${media.service.url:http://localhost:8082}")
    private String mediaServiceUrl;

    public RecordingListResponse getRecordings(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Recording> recordings = recordingRepository
                .findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, RecordingStatus.DELETED, pageable);

        Map<Long, String> uuidMap = resolveStudioUuids(
                recordings.getContent().stream().map(Recording::getStudioId).collect(Collectors.toList()));
        Page<RecordingResponse> responsePage = recordings.map(r -> RecordingResponse.from(r,
                r.getStudioId() != null ? uuidMap.get(r.getStudioId()) : null));
        return RecordingListResponse.from(responsePage);
    }

    public RecordingListResponse getRecordingsByStudio(String studioId, int page, int size) {
        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));
        Pageable pageable = PageRequest.of(page, size);
        Page<Recording> recordings = recordingRepository
                .findByStudioIdAndStatusNotOrderByCreatedAtDesc(studio.getId(), RecordingStatus.DELETED, pageable);

        Page<RecordingResponse> responsePage = recordings.map(r -> RecordingResponse.from(r, studioId));
        return RecordingListResponse.from(responsePage);
    }

    public RecordingResponse getRecording(String userId, String recordingId) {
        Recording recording = recordingRepository.findByRecordingIdAndStatusNot(recordingId, RecordingStatus.DELETED)
                .orElseThrow(() -> new RecordingNotFoundException(recordingId));

        validateAccess(userId, recording);

        String studioUuid = resolveStudioUuid(recording.getStudioId());
        return RecordingResponse.from(recording, studioUuid);
    }

    @Transactional
    public RecordingResponse createRecording(String userId, CreateRecordingRequest request) {
        String studioUuid = request.getStudioId();
        Studio studio = studioRepository.findByStudioId(studioUuid)
                .orElseThrow(() -> new StudioNotFoundException(studioUuid));

        String title = request.getTitle();
        if (title == null || title.isBlank()) {
            title = "녹화 - " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        }

        Recording recording = Recording.builder()
                .studioId(studio.getId())
                .userId(userId)
                .title(title)
                .description(request.getDescription())
                .status(RecordingStatus.RECORDING)
                .mediaRecordingId(request.getMediaRecordingId())
                .build();

        recordingRepository.save(recording);

        log.info("Recording created: recordingId={}, studioId={}, userId={}",
                recording.getRecordingId(), studioUuid, userId);

        return RecordingResponse.from(recording, studioUuid);
    }

    @Transactional
    public RecordingResponse updateRecording(String userId, String recordingId, UpdateRecordingRequest request) {
        Recording recording = recordingRepository.findByRecordingIdAndStatusNot(recordingId, RecordingStatus.DELETED)
                .orElseThrow(() -> new RecordingNotFoundException(recordingId));

        validateAccess(userId, recording);

        recording.updateInfo(request.getTitle(), request.getDescription());
        recordingRepository.save(recording);

        log.info("Recording updated: recordingId={}", recordingId);

        String studioUuid = resolveStudioUuid(recording.getStudioId());
        return RecordingResponse.from(recording, studioUuid);
    }

    @Transactional
    public void deleteRecording(String userId, String recordingId) {
        Recording recording = recordingRepository.findByRecordingIdAndStatusNot(recordingId, RecordingStatus.DELETED)
                .orElseThrow(() -> new RecordingNotFoundException(recordingId));

        validateAccess(userId, recording);

        recording.markAsDeleted();
        recordingRepository.save(recording);

        log.info("Recording deleted: recordingId={}", recordingId);
    }

    public DownloadUrlResponse getDownloadUrl(String userId, String recordingId) {
        Recording recording = recordingRepository.findByRecordingIdAndStatusNot(recordingId, RecordingStatus.DELETED)
                .orElseThrow(() -> new RecordingNotFoundException(recordingId));

        validateAccess(userId, recording);

        if (recording.getFileUrl() == null) {
            throw new RecordingNotFoundException(recordingId);
        }

        return DownloadUrlResponse.builder()
                .downloadUrl(recording.getFileUrl())
                .expiresIn(3600L)
                .build();
    }

    @Transactional
    public RecordingResponse updateRecordingMedia(Long mediaRecordingId, String filePath, String fileUrl,
                                                   Long fileSize, Integer durationSeconds, String thumbnailUrl) {
        Recording recording = recordingRepository.findByMediaRecordingId(mediaRecordingId)
                .orElseThrow(() -> new RecordingNotFoundException(mediaRecordingId));

        recording.updateMediaInfo(filePath, fileUrl, fileSize, durationSeconds, thumbnailUrl);
        recordingRepository.save(recording);

        log.info("Recording media updated: recordingId={}, filePath={}", recording.getRecordingId(), filePath);

        String studioUuid = resolveStudioUuid(recording.getStudioId());
        return RecordingResponse.from(recording, studioUuid);
    }

    @Transactional
    public void markRecordingAsFailed(Long mediaRecordingId, String errorMessage) {
        recordingRepository.findByMediaRecordingId(mediaRecordingId)
                .ifPresent(recording -> {
                    recording.markAsFailed(errorMessage);
                    recordingRepository.save(recording);
                    log.warn("Recording marked as failed: recordingId={}, error={}",
                            recording.getRecordingId(), errorMessage);
                });
    }

    private void validateAccess(String userId, Recording recording) {
        if (!recording.getUserId().equals(userId)) {
            throw new RecordingAccessDeniedException(recording.getRecordingId());
        }
    }

    // ==================== Clip ====================

    public ClipListResponse getClips(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Clip> clips = clipRepository
                .findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, ClipStatus.DELETED, pageable);

        Page<ClipResponse> responsePage = clips.map(ClipResponse::from);
        return ClipListResponse.from(responsePage);
    }

    // ==================== Storage ====================

    public StorageResponse getStorage(String userId) {
        Long recordingSize = recordingRepository.getTotalFileSizeByUserId(userId);
        Long clipSize = clipRepository.getTotalFileSizeByUserId(userId);

        Long shortsSize = 0L;
        User user = userRepository.findByUserId(userId).orElse(null);
        if (user != null) {
            shortsSize = shortsResultRepository.getTotalSavedFileSizeByUserId(user.getId());
        }

        Long videoBytes = (recordingSize != null ? recordingSize : 0L) +
                          (clipSize != null ? clipSize : 0L);
        Long shortsBytes = (shortsSize != null ? shortsSize : 0L);
        Long assetBytes = 0L; // 에셋 스토리지는 추후 구현

        Long totalUsed = videoBytes + shortsBytes + assetBytes;

        return StorageResponse.of(totalUsed, storageLimitBytes, videoBytes, assetBytes, shortsBytes);
    }

    /**
     * 스토리지 용량 체크 (10GB 제한)
     * @param userId 사용자 ID
     * @param additionalBytes 추가로 저장할 파일 크기 (bytes)
     * @throws com.onetake.core.library.exception.StorageQuotaExceededException 용량 초과 시
     */
    public void checkStorageQuota(String userId, Long additionalBytes) {
        if (additionalBytes == null || additionalBytes <= 0) {
            return; // 용량 체크 불필요
        }

        Long recordingSize = recordingRepository.getTotalFileSizeByUserId(userId);
        Long clipSize = clipRepository.getTotalFileSizeByUserId(userId);

        Long shortsSize = 0L;
        User user = userRepository.findByUserId(userId).orElse(null);
        if (user != null) {
            shortsSize = shortsResultRepository.getTotalSavedFileSizeByUserId(user.getId());
        }

        Long currentUsed = (recordingSize != null ? recordingSize : 0L) +
                           (clipSize != null ? clipSize : 0L) +
                           (shortsSize != null ? shortsSize : 0L);

        Long totalAfter = currentUsed + additionalBytes;

        if (totalAfter > storageLimitBytes) {
            Long available = storageLimitBytes - currentUsed;
            throw new com.onetake.core.library.exception.StorageQuotaExceededException(
                    userId, additionalBytes, available);
        }

        log.debug("Storage quota check passed: userId={}, current={}GB, adding={}GB, limit={}GB",
                userId,
                currentUsed / (1024.0 * 1024.0 * 1024.0),
                additionalBytes / (1024.0 * 1024.0 * 1024.0),
                storageLimitBytes / (1024.0 * 1024.0 * 1024.0));
    }

    /**
     * 스토리지 여유 공간 확인
     */
    public boolean hasStorageSpace(String userId, Long requiredBytes) {
        try {
            checkStorageQuota(userId, requiredBytes);
            return true;
        } catch (com.onetake.core.library.exception.StorageQuotaExceededException e) {
            return false;
        }
    }

    /**
     * 저장된 파일 목록 조회 (녹화 + 클립)
     */
    public StorageFilesResponse getStorageFiles(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        // 녹화 파일 조회
        Page<Recording> recordings = recordingRepository
                .findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, RecordingStatus.DELETED, pageable);

        return StorageFilesResponse.from(recordings);
    }

    // ==================== Studio UUID Helpers ====================

    private String resolveStudioUuid(Long internalStudioId) {
        if (internalStudioId == null) return null;
        return studioRepository.findById(internalStudioId)
                .map(Studio::getStudioId)
                .orElse(null);
    }

    private Map<Long, String> resolveStudioUuids(List<Long> internalIds) {
        List<Long> distinct = internalIds.stream().filter(id -> id != null).distinct().collect(Collectors.toList());
        if (distinct.isEmpty()) return Map.of();
        return studioRepository.findAllById(distinct).stream()
                .collect(Collectors.toMap(Studio::getId, Studio::getStudioId));
    }

    // ==================== Comment Analysis & Markers (Media Service Proxy) ====================

    /**
     * 댓글 분석 데이터 조회 (Media Service에서 가져옴)
     */
    public Map<String, Object> getCommentAnalysis(String userId, String recordingId) {
        Recording recording = recordingRepository.findByRecordingIdAndStatusNot(recordingId, RecordingStatus.DELETED)
                .orElseThrow(() -> new RecordingNotFoundException(recordingId));
        validateAccess(userId, recording);

        Long mediaRecordingId = recording.getMediaRecordingId();
        if (mediaRecordingId == null) {
            return Map.of("recordingId", recordingId, "durationSeconds", 0, "buckets", List.of());
        }

        try {
            String url = mediaServiceUrl + "/api/media/internal/recordings/" + mediaRecordingId + "/comment-stats";
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<Map<String, Object>>() {});

            Map<String, Object> body = response.getBody();
            if (body != null) {
                // recordingId를 Core Service의 UUID로 교체
                body.put("recordingId", recordingId);
                return body;
            }
        } catch (Exception e) {
            log.error("Media Service 댓글 분석 조회 실패: recordingId={}, mediaRecordingId={}", recordingId, mediaRecordingId, e);
        }

        return Map.of("recordingId", recordingId, "durationSeconds", 0, "buckets", List.of());
    }

    /**
     * 마커(북마크) 목록 조회 (Media Service에서 가져옴)
     */
    public Map<String, Object> getMarkers(String userId, String recordingId) {
        Recording recording = recordingRepository.findByRecordingIdAndStatusNot(recordingId, RecordingStatus.DELETED)
                .orElseThrow(() -> new RecordingNotFoundException(recordingId));
        validateAccess(userId, recording);

        Long mediaRecordingId = recording.getMediaRecordingId();
        if (mediaRecordingId == null) {
            return Map.of("markers", List.of());
        }

        try {
            String url = mediaServiceUrl + "/api/media/internal/recordings/" + mediaRecordingId + "/markers";
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<Map<String, Object>>() {});

            Map<String, Object> body = response.getBody();
            if (body != null) {
                return body;
            }
        } catch (Exception e) {
            log.error("Media Service 마커 조회 실패: recordingId={}, mediaRecordingId={}", recordingId, mediaRecordingId, e);
        }

        return Map.of("markers", List.of());
    }
}
