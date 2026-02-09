package com.onetake.core.library.event;

import com.onetake.core.library.entity.Recording;
import com.onetake.core.library.entity.RecordingStatus;
import com.onetake.core.library.repository.RecordingRepository;
import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.repository.StudioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class RecordingEventListener implements StreamListener<String, MapRecord<String, String, String>> {

    private final RecordingRepository recordingRepository;
    private final StudioRepository studioRepository;
    private final StringRedisTemplate stringRedisTemplate;

    @Override
    @Transactional
    public void onMessage(MapRecord<String, String, String> message) {
        try {
            String streamKey = message.getStream();
            String recordId = message.getId().getValue();
            Map<String, String> event = message.getValue();

            log.info("Redis Stream 메시지 수신: stream={}, recordId={}", streamKey, recordId);
            log.debug("메시지 페이로드: {}", event);

            String eventType = event.get("type");

            if ("RECORDING_STOPPED".equals(eventType)) {
                handleRecordingStopped(event);
            } else {
                log.debug("처리하지 않는 이벤트 타입: {}", eventType);
            }

            // 메시지 처리 완료 후 ACK
            stringRedisTemplate.opsForStream().acknowledge(streamKey, "core-service-group", recordId);
            log.debug("메시지 ACK 완료: {}", recordId);

        } catch (Exception e) {
            log.error("Redis Stream 메시지 처리 중 오류: {}", e.getMessage(), e);
        }
    }

    private void handleRecordingStopped(Map<String, String> event) {
        try {
            Long mediaRecordingId = parseLong(event.get("recordingId"));
            String rawUserId = event.get("userId");
            String studioUuid = event.get("studioId");
            String filePath = event.get("filePath");
            String fileUrl = event.get("fileUrl");
            Long fileSize = parseLong(event.get("fileSize"));
            Integer durationSeconds = parseInt(event.get("durationSeconds"));
            String thumbnailUrl = event.get("thumbnailUrl");
            String recordingName = event.get("recordingName");

            if (mediaRecordingId == null || rawUserId == null || "null".equals(rawUserId)) {
                log.warn("RECORDING_STOPPED 이벤트에 필수 필드 누락: recordingId={}, userId={}",
                        mediaRecordingId, rawUserId);
                return;
            }

            // studioId 조회 (UUID -> 내부 ID)
            Long studioId = null;
            if (studioUuid != null && !"null".equals(studioUuid)) {
                Studio studio = studioRepository.findByStudioId(studioUuid).orElse(null);
                if (studio != null) {
                    studioId = studio.getId();
                }
            }

            if (studioId == null) {
                log.info("studioId 없는 업로드 녹화: studioUuid={}, userId={}", studioUuid, rawUserId);
            }

            // 이미 Recording이 존재하는지 확인
            if (recordingRepository.existsByMediaRecordingId(mediaRecordingId)) {
                log.info("Recording이 이미 존재함: mediaRecordingId={}", mediaRecordingId);
                return;
            }

            // 제목 설정
            String title = (recordingName != null && !recordingName.isBlank())
                    ? recordingName
                    : "스트리밍 녹화 - " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

            // Recording 엔티티 생성
            Recording recording = Recording.builder()
                    .studioId(studioId)
                    .userId(rawUserId)
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

            log.info("스트리밍 녹화 Recording 생성 완료: recordingId={}, mediaRecordingId={}, studioId={}, userId={}",
                    recording.getRecordingId(), mediaRecordingId, studioId, rawUserId);

        } catch (Exception e) {
            log.error("RECORDING_STOPPED 이벤트 처리 중 오류: {}", e.getMessage(), e);
        }
    }

    private Long parseLong(String value) {
        if (value == null || "null".equals(value)) return null;
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parseInt(String value) {
        if (value == null || "null".equals(value)) return null;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
