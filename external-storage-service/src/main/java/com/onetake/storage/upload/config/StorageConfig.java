package com.onetake.storage.upload.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 저장소 설정
 */
@Configuration
@ConfigurationProperties(prefix = "storage")
@Getter
@Setter
public class StorageConfig {

    /**
     * 최종 파일 저장 경로
     */
    private String basePath = "./storage/files";

    /**
     * 청크 임시 저장 경로
     */
    private String chunkPath = "./storage/chunks";

    /**
     * 파일 접근 기본 URL
     */
    private String baseUrl = "http://localhost:8090/files";
}
