package com.onetakesutdio.cloudapitest.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        String method = request.getMethod();
        String uri = request.getRequestURI();

        long startTime = System.currentTimeMillis();
        log.info("[{}] >>> {} {}", requestId, method, uri);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long elapsed = System.currentTimeMillis() - startTime;
            log.info("[{}] <<< {} {} - status={} ({}ms)", requestId, method, uri, response.getStatus(), elapsed);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/actuator");
    }
}
