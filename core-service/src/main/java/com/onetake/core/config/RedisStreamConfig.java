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

        // Consumer group 생성 (이미 존재하면 무시)
        try {
            redisTemplate.opsForStream().createGroup(STREAM_KEY, ReadOffset.from("0"), CONSUMER_GROUP);
            log.info("Redis Stream consumer group created: {}", CONSUMER_GROUP);
        } catch (Exception e) {
            log.debug("Consumer group already exists or stream not initialized: {}", e.getMessage());
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
