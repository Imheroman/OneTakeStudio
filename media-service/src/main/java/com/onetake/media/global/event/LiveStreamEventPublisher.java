package com.onetake.media.global.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * 라이브 스트림 이벤트를 Redis Streams를 통해 Core Service에 발행
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LiveStreamEventPublisher {

    private final StringRedisTemplate redisTemplate;

    private static final String STREAM_KEY = "live-stream-events";

    /**
     * 라이브 시작 이벤트 발행
     */
    public void publishLiveStarted(Long studioId, Long userId, String roomName) {
        Map<String, String> event = new HashMap<>();
        event.put("eventType", "LIVE_STARTED");
        event.put("studioId", String.valueOf(studioId));
        event.put("userId", String.valueOf(userId));
        event.put("roomName", roomName);
        event.put("timestamp", Instant.now().toString());

        try {
            MapRecord<String, String, String> record = StreamRecords
                    .mapBacked(event)
                    .withStreamKey(STREAM_KEY);

            redisTemplate.opsForStream().add(record);
            log.info("Published LIVE_STARTED event: studioId={}, userId={}, roomName={}",
                    studioId, userId, roomName);
        } catch (Exception e) {
            log.warn("Failed to publish LIVE_STARTED event to Redis Streams: {}", e.getMessage());
            // Redis 실패해도 송출은 계속 진행
        }
    }

    /**
     * 라이브 종료 이벤트 발행
     */
    public void publishLiveEnded(Long studioId, Long userId, String roomName) {
        Map<String, String> event = new HashMap<>();
        event.put("eventType", "LIVE_ENDED");
        event.put("studioId", String.valueOf(studioId));
        event.put("userId", String.valueOf(userId));
        event.put("roomName", roomName);
        event.put("timestamp", Instant.now().toString());

        try {
            MapRecord<String, String, String> record = StreamRecords
                    .mapBacked(event)
                    .withStreamKey(STREAM_KEY);

            redisTemplate.opsForStream().add(record);
            log.info("Published LIVE_ENDED event: studioId={}, userId={}, roomName={}",
                    studioId, userId, roomName);
        } catch (Exception e) {
            log.warn("Failed to publish LIVE_ENDED event to Redis Streams: {}", e.getMessage());
        }
    }
}
