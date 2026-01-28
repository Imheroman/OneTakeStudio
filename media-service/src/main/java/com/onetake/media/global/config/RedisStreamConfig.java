package com.onetake.media.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.stream.StreamMessageListenerContainer;

import java.time.Duration;

/**
 * Redis Streams 설정
 * - RabbitMQ를 대체하여 서비스 간 이벤트 전달
 * - media-events 스트림을 통해 녹화 완료 등의 이벤트 발행
 */
@Configuration
public class RedisStreamConfig {

    public static final String STREAM_KEY = "media-events";
    public static final String CONSUMER_GROUP = "media-service-group";

    @Bean
    public StreamMessageListenerContainer<String, MapRecord<String, String, String>>
            streamMessageListenerContainer(RedisConnectionFactory connectionFactory) {

        StreamMessageListenerContainer.StreamMessageListenerContainerOptions<String, MapRecord<String, String, String>> options =
                StreamMessageListenerContainer.StreamMessageListenerContainerOptions.builder()
                        .pollTimeout(Duration.ofSeconds(1))
                        .build();

        return StreamMessageListenerContainer.create(connectionFactory, options);
    }
}
