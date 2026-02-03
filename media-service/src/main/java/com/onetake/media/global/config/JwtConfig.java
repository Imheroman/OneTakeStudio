package com.onetake.media.global.config;

import com.onetake.common.jwt.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JwtConfig {

    @Value("${jwt.secret}")
    private String secret;

    @Bean
    public JwtUtil jwtUtil() {
        // media-service는 토큰 검증만 하므로 expiration은 사용하지 않음
        return new JwtUtil(secret, 0, 0);
    }
}
