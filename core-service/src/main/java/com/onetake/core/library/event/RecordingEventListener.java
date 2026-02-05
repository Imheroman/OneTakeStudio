package com.onetake.core.library.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.core.library.entity.Recording;
import com.onetake.core.library.entity.RecordingStatus;
import com.onetake.core.library.repository.RecordingRepository;
import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.repository.StudioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.ObjectRecord;
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
public class RecordingEventListener implements StreamListener<String, ObjectRecord<String, String>> {

    private final RecordingRepository recordingRepository;
    private final StudioRepository studioRepository;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void onMessage(ObjectRecord<String, String> message) {
        try {
            String streamKey = message.getStream();
            String recordId = message.getId().getValue();
            String payload = message.getValue();

            log.info("Redis Stream 메시지 수신: stream={}, recordId={}", streamKey, recordId);
            log.debug("메시지 페이로드: {}", payload);

            // JSON 파싱 (Media Service 필드명 기준)
            Map<String, Object> event = objectMapper.readValue(payload, Map.class);
            String eventType = (String) event.get("type");

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

    private void handleRecordingStopped(Map<String, Object> event) {
        try {
            // Media Service에서 전달하는 이벤트 데이터 추출 (Media Service 필드명 기준)
            Long mediaRecordingId = extractLong(event, "recordingId");
            String rawUserId = String.valueOf(event.get("userId"));
            String studioUuid = String.valueOf(event.get("studioId"));
            String filePath = (String) event.get("filePath");
            String fileUrl = (String) event.get("fileUrl");
            Long fileSize = extractLong(event, "fileSize");
            Integer durationSeconds = extractInt(event, "durationSeconds");
            String thumbnailUrl = (String) event.get("thumbnailUrl");
            String recordingName = (String) event.get("recordingName");

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
                log.warn("RECORDING_STOPPED 이벤트에 유효한 studioId 없음: studioUuid={}", studioUuid);
                return;
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

    private Long extractLong(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).longValue();
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer extractInt(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) return null;
        if (value instanceof Number) return ((Number) value).intValue();
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
