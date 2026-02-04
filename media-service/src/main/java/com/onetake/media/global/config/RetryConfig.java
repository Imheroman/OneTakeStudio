package com.onetake.media.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * 재시도 설정
 * - LiveKit, 외부 API 호출 시 일시적 장애 대응
 * - Exponential Backoff: 재시도 간격을 점진적으로 증가 (1초 -> 2초 -> 4초)
 */
@Configuration
@EnableRetry
public class RetryConfig {

    @Bean
    public RetryTemplate retryTemplate() {
        RetryTemplate retryTemplate = new RetryTemplate();

        // 재시도 정책: 최대 3회 재시도
        Map<Class<? extends Throwable>, Boolean> retryableExceptions = new HashMap<>();
        retryableExceptions.put(java.net.SocketTimeoutException.class, true);
        retryableExceptions.put(java.io.IOException.class, true);
        retryableExceptions.put(org.springframework.web.client.ResourceAccessException.class, true);

        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy(3, retryableExceptions);
        retryTemplate.setRetryPolicy(retryPolicy);

        // Backoff 정책: 1초부터 시작, 2배씩 증가, 최대 10초
        ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(1000);  // 1초
        backOffPolicy.setMultiplier(2.0);        // 2배씩 증가
        backOffPolicy.setMaxInterval(10000);     // 최대 10초
        retryTemplate.setBackOffPolicy(backOffPolicy);

        return retryTemplate;
    }
}
