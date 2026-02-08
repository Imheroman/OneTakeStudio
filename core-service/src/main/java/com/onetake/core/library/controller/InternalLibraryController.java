package com.onetake.core.library.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.library.entity.Recording;
import com.onetake.core.library.entity.RecordingStatus;
import com.onetake.core.library.repository.RecordingRepository;
import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.repository.StudioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * 내부 서비스 간 통신용 라이브러리 API
 * media-service에서 녹화 완료 시 직접 호출하여 Recording 엔티티 생성
 */
@Slf4j
@RestController
@RequestMapping("/api/internal/library")
@RequiredArgsConstructor
public class InternalLibraryController {

    private final RecordingRepository recordingRepository;
    private final StudioRepository studioRepository;

    @PostMapping("/recordings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createRecording(@RequestBody Map<String, Object> request) {
        try {
            Long mediaRecordingId = toLong(request.get("mediaRecordingId"));
            String userId = toString(request.get("userId"));
            String studioUuid = toString(request.get("studioId"));
            String title = toString(request.get("title"));
            String filePath = toString(request.get("filePath"));
            String fileUrl = toString(request.get("fileUrl"));
            Long fileSize = toLong(request.get("fileSize"));
            Integer durationSeconds = toInt(request.get("durationSeconds"));
            String thumbnailUrl = toString(request.get("thumbnailUrl"));

            if (mediaRecordingId == null || userId == null) {
                log.warn("내부 API 녹화 등록 요청에 필수 필드 누락: mediaRecordingId={}, userId={}",
                        mediaRecordingId, userId);
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("필수 필드 누락: mediaRecordingId, userId"));
            }

            // 중복 체크
            if (recordingRepository.existsByMediaRecordingId(mediaRecordingId)) {
                log.info("Recording이 이미 존재함 (내부 API): mediaRecordingId={}", mediaRecordingId);
                return ResponseEntity.ok(ApiResponse.success("이미 존재하는 녹화", Map.of(
                        "mediaRecordingId", mediaRecordingId,
                        "duplicate", true
                )));
            }

            // studioId 조회 (UUID -> 내부 ID)
            Long studioId = null;
            if (studioUuid != null) {
                Studio studio = studioRepository.findByStudioId(studioUuid).orElse(null);
                if (studio != null) {
                    studioId = studio.getId();
                }
            }

            // 제목 설정
            if (title == null || title.isBlank()) {
                title = "스트리밍 녹화 - " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
            }

            // Recording 엔티티 생성
            Recording recording = Recording.builder()
                    .studioId(studioId)
                    .userId(userId)
                    .title(title)
                    .filePath(filePath)
                    .fileUrl(fileUrl)
                    .fileSize(fileSize)
                    .durationSeconds(durationSeconds)
                    .thumbnailUrl(thumbnailUrl)
                    .status(RecordingStatus.READY)
                    .mediaRecordingId(mediaRecordingId)
                    .build();

            recordingRepository.save(recording);

            log.info("내부 API로 Recording 생성 완료: recordingId={}, mediaRecordingId={}, studioId={}, userId={}",
                    recording.getRecordingId(), mediaRecordingId, studioId, userId);

            return ResponseEntity.ok(ApiResponse.success("녹화 등록 성공", Map.of(
                    "recordingId", recording.getRecordingId(),
                    "mediaRecordingId", mediaRecordingId
            )));

        } catch (Exception e) {
            log.error("내부 API 녹화 등록 중 오류: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("녹화 등록 실패: " + e.getMessage()));
        }
    }

    private Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).longValue();
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer toInt(Object value) {
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).intValue();
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String toString(Object value) {
        if (value == null || "null".equals(value.toString())) return null;
        return value.toString();
    }
}
