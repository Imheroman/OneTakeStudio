package com.onetake.media.global.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.*;

/**
 * JwtAuthenticationFilter 이후 실행되어,
 * SecurityContext의 userId를 X-User-Id 헤더로 주입하는 필터.
 *
 * API Gateway 없이 직접 요청이 오는 환경(K8s Traefik, Next.js rewrites 등)에서
 * 컨트롤러의 @RequestHeader("X-User-Id")가 동작하도록 보장한다.
 * 이미 X-User-Id 헤더가 있으면 스킵한다.
 */
@Component
public class UserIdHeaderFilter extends OncePerRequestFilter {

    private static final String USER_ID_HEADER = "X-User-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // 이미 헤더가 있으면 그대로 통과
        if (request.getHeader(USER_ID_HEADER) != null) {
            filterChain.doFilter(request, response);
            return;
        }

        // SecurityContext에서 userId 추출
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails userDetails) {
            String userId = userDetails.getUserId();
            if (userId != null) {
                filterChain.doFilter(new UserIdHeaderRequestWrapper(request, userId), response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private static class UserIdHeaderRequestWrapper extends HttpServletRequestWrapper {
        private final String userId;

        public UserIdHeaderRequestWrapper(HttpServletRequest request, String userId) {
            super(request);
            this.userId = userId;
        }

        @Override
        public String getHeader(String name) {
            if (USER_ID_HEADER.equalsIgnoreCase(name)) {
                return userId;
            }
            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if (USER_ID_HEADER.equalsIgnoreCase(name)) {
                return Collections.enumeration(List.of(userId));
            }
            return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            List<String> names = new ArrayList<>(Collections.list(super.getHeaderNames()));
            if (!names.stream().anyMatch(USER_ID_HEADER::equalsIgnoreCase)) {
                names.add(USER_ID_HEADER);
            }
            return Collections.enumeration(names);
        }
    }
}
