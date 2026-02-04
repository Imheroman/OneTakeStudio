package com.onetake.media.recording.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 외부 EC2 서버 업로드 설정
 */
@Configuration
@ConfigurationProperties(prefix = "external.upload")
@Getter
@Setter
public class ExternalUploadConfig {

    /**
     * 외부 업로드 활성화 여부
     */
    private boolean enabled = false;

    /**
     * 외부 서버 URL (청크 업로드 API 베이스 URL)
     */
    private String serverUrl = "http://external-ec2:8080/api/upload";

    /**
     * API 인증 키
     */
    private String apiKey = "";

    /**
     * HTTP 요청 타임아웃 (밀리초)
     */
    private int timeout = 300000; // 5분

    /**
     * 청크 크기 (바이트) - 기본 50MB
     */
    private int chunkSize = 50 * 1024 * 1024;

    /**
     * 청크 업로드 실패 시 최대 재시도 횟수
     */
    private int maxRetries = 3;

    /**
     * 재시도 간격 (밀리초)
     */
    private int retryDelay = 1000;
}
