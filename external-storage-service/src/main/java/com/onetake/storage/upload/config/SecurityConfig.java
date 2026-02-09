package com.onetake.storage.upload.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * API Key 기반 인증 필터 설정
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    @Value("${security.api-key:}")
    private String apiKey;

    @Value("${security.enabled:false}")
    private boolean securityEnabled;

    @Bean
    public ApiKeyAuthFilter apiKeyAuthFilter() {
        return new ApiKeyAuthFilter(apiKey, securityEnabled);
    }

    @Slf4j
    public static class ApiKeyAuthFilter extends OncePerRequestFilter {

        private final String apiKey;
        private final boolean securityEnabled;

        public ApiKeyAuthFilter(String apiKey, boolean securityEnabled) {
            this.apiKey = apiKey;
            this.securityEnabled = securityEnabled;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {

            // 보안이 비활성화된 경우 통과
            if (!securityEnabled) {
                filterChain.doFilter(request, response);
                return;
            }

            // Actuator 엔드포인트는 제외
            String path = request.getRequestURI();
            if (path.startsWith("/actuator") || path.equals("/health")) {
                filterChain.doFilter(request, response);
                return;
            }

            // 파일 다운로드 엔드포인트는 제외
            if (path.startsWith("/files")) {
                filterChain.doFilter(request, response);
                return;
            }

            // API Key 검증
            String requestApiKey = request.getHeader("X-API-Key");
            if (apiKey == null || apiKey.isEmpty()) {
                // API Key가 설정되지 않은 경우 통과
                filterChain.doFilter(request, response);
                return;
            }

            if (requestApiKey == null || !requestApiKey.equals(apiKey)) {
                log.warn("Invalid API key from: {}", request.getRemoteAddr());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Invalid or missing API key\"}");
                return;
            }

            filterChain.doFilter(request, response);
        }
    }
}
