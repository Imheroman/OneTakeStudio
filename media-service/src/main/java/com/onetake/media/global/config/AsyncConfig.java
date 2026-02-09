package com.onetake.media.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * 비동기 처리 설정
 * 외부 EC2 업로드 등 비동기 작업을 위한 스레드 풀 설정
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "uploadTaskExecutor")
    public Executor uploadTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("Upload-");
        executor.initialize();
        return executor;
    }
}
