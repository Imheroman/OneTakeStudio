package com.onetake.core.library.service;

import com.onetake.core.library.dto.*;
import com.onetake.core.library.entity.Clip;
import com.onetake.core.library.entity.ClipStatus;
import com.onetake.core.library.entity.Recording;
import com.onetake.core.library.entity.RecordingStatus;
import com.onetake.core.library.exception.RecordingAccessDeniedException;
import com.onetake.core.library.exception.RecordingNotFoundException;
import com.onetake.core.library.repository.ClipRepository;
import com.onetake.core.library.repository.RecordingRepository;
import org.springframework.beans.factory.annotation.Value;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LibraryService {

    private final RecordingRepository recordingRepository;
    private final ClipRepository clipRepository;

    @Value("${library.storage.limit-bytes:32212254720}")
    private Long storageLimitBytes; // 기본 30GB

    public RecordingListResponse getRecordings(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Recording> recordings = recordingRepository
                .findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, RecordingStatus.DELETED, pageable);

        Page<RecordingResponse> responsePage = recordings.map(RecordingResponse::from);
        return RecordingListResponse.from(responsePage);
    }

    public RecordingListResponse getRecordingsByStudio(Long studioId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Recording> recordings = recordingRepository
                .findByStudioIdAndStatusNotOrderByCreatedAtDesc(studioId, RecordingStatus.DELETED, pageable);

        Page<RecordingResponse> responsePage = recordings.map(RecordingResponse::from);
        return RecordingListResponse.from(responsePage);
    }

    public RecordingResponse getRecording(String userId, String recordingId) {
        Recording recording = recordingRepository.findByRecordingIdAndStatusNot(recordingId, RecordingStatus.DELETED)
                .orElseThrow(() -> new RecordingNotFoundException(recordingId));

        validateAccess(userId, recording);

        return RecordingResponse.from(recording);
    }

    @Transactional
    public RecordingResponse createRecording(String userId, CreateRecordingRequest request) {
        String title = request.getTitle();
        if (title == null || title.isBlank()) {
            title = "녹화 - " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        }

        Recording recording = Recording.builder()
                .studioId(request.getStudioId())
                .userId(userId)
                .title(title)
                .description(request.getDescription())
                .status(RecordingStatus.RECORDING)
                .mediaRecordingId(request.getMediaRecordingId())
                .build();

        recordingRepository.save(recording);

        log.info("Recording created: recordingId={}, studioId={}, userId={}",
                recording.getRecordingId(), request.getStudioId(), userId);

        return RecordingResponse.from(recording);
    }

    @Transactional
    public RecordingResponse updateRecording(String userId, String recordingId, UpdateRecordingRequest request) {
        Recording recording = recordingRepository.findByRecordingIdAndStatusNot(recordingId, RecordingStatus.DELETED)
                .orElseThrow(() -> new RecordingNotFoundException(recordingId));

        validateAccess(userId, recording);

        recording.updateInfo(request.getTitle(), request.getDescription());
        recordingRepository.save(recording);

        log.info("Recording updated: recordingId={}", recordingId);

        return RecordingResponse.from(recording);
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

        if (recording.getS3Url() == null) {
            throw new RecordingNotFoundException(recordingId);
        }

        return DownloadUrlResponse.builder()
                .downloadUrl(recording.getS3Url())
                .expiresIn(3600L)
                .build();
    }

    @Transactional
    public RecordingResponse updateRecordingMedia(Long mediaRecordingId, String s3Key, String s3Url,
                                                   Long fileSize, Integer durationSeconds, String thumbnailUrl) {
        Recording recording = recordingRepository.findByMediaRecordingId(mediaRecordingId)
                .orElseThrow(() -> new RecordingNotFoundException(mediaRecordingId));

        recording.updateMediaInfo(s3Key, s3Url, fileSize, durationSeconds, thumbnailUrl);
        recordingRepository.save(recording);

        log.info("Recording media updated: recordingId={}, s3Key={}", recording.getRecordingId(), s3Key);

        return RecordingResponse.from(recording);
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

        Long videoBytes = (recordingSize != null ? recordingSize : 0L) +
                          (clipSize != null ? clipSize : 0L);
        Long assetBytes = 0L; // 에셋 스토리지는 추후 구현

        Long totalUsed = videoBytes + assetBytes;

        return StorageResponse.of(totalUsed, storageLimitBytes, videoBytes, assetBytes);
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
}
