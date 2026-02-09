package com.onetake.core.config;

import com.onetake.core.library.event.RecordingEventListener;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamMessageListenerContainer;
import org.springframework.data.redis.stream.Subscription;

import java.time.Duration;

@Slf4j
@Configuration
public class RedisStreamConfig {

    public static final String STREAM_KEY = "media-events";
    public static final String CONSUMER_GROUP = "core-service-group";
    public static final String CONSUMER_NAME = "core-consumer-1";

    @Bean
    public Subscription mediaEventsSubscription(
            RedisConnectionFactory connectionFactory,
            StringRedisTemplate redisTemplate,
            RecordingEventListener listener) {

        // Stream이 존재하지 않으면 빈 stream 생성 후 consumer group 생성
        try {
            if (!Boolean.TRUE.equals(redisTemplate.hasKey(STREAM_KEY))) {
                // 빈 메시지를 추가하여 stream을 생성한 뒤 즉시 삭제
                var emptyRecord = redisTemplate.opsForStream().add(STREAM_KEY, java.util.Map.of("_init", "1"));
                if (emptyRecord != null) {
                    redisTemplate.opsForStream().delete(STREAM_KEY, emptyRecord.getValue());
                }
                log.info("Redis Stream 생성됨: {}", STREAM_KEY);
            }

            redisTemplate.opsForStream().createGroup(STREAM_KEY, ReadOffset.from("0"), CONSUMER_GROUP);
            log.info("Redis Stream consumer group created: {}", CONSUMER_GROUP);
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("BUSYGROUP")) {
                log.info("Consumer group already exists: {}", CONSUMER_GROUP);
            } else {
                log.warn("Consumer group 생성 실패: {}", e.getMessage(), e);
            }
        }

        StreamMessageListenerContainer.StreamMessageListenerContainerOptions<String, MapRecord<String, String, String>> options =
                StreamMessageListenerContainer.StreamMessageListenerContainerOptions.builder()
                        .pollTimeout(Duration.ofSeconds(1))
                        .build();

        StreamMessageListenerContainer<String, MapRecord<String, String, String>> container =
                StreamMessageListenerContainer.create(connectionFactory, options);

        Subscription subscription = container.receive(
                Consumer.from(CONSUMER_GROUP, CONSUMER_NAME),
                StreamOffset.create(STREAM_KEY, ReadOffset.lastConsumed()),
                listener);

        container.start();
        log.info("Redis Stream consumer started: stream={}, group={}, consumer={}",
                STREAM_KEY, CONSUMER_GROUP, CONSUMER_NAME);

        return subscription;
    }
}
