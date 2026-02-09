package com.onetake.media.recording.controller;

import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.recording.dto.RecordingResponse;
import com.onetake.media.recording.service.RecordingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/media/upload")
@RequiredArgsConstructor
public class UploadController {

    private final RecordingService recordingService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<RecordingResponse>> uploadVideo(
            @RequestHeader("X-User-Id") String odUserId,
            @RequestParam(value = "studioId", required = false) String studioId,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "durationSeconds", required = false) Long durationSeconds,
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("파일이 비어있습니다."));
        }

        String finalTitle = (title != null && !title.isBlank()) ? title : file.getOriginalFilename();

        log.info("영상 업로드 요청: odUserId={}, studioId={}, title={}, fileSize={}, durationSeconds={}",
                odUserId, studioId, finalTitle, file.getSize(), durationSeconds);

        RecordingResponse response = recordingService.uploadRecording(odUserId, studioId, finalTitle, durationSeconds, file);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
