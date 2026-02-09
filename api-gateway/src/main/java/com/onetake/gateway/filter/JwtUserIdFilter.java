package com.onetake.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;

@Slf4j
@Component
public class JwtUserIdFilter implements GlobalFilter, Ordered {

    private final SecretKey secretKey;

    public JwtUserIdFilter(@Value("${jwt.secret}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Claims claims = Jwts.parser()
                        .verifyWith(secretKey)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();

                ServerHttpRequest.Builder requestBuilder = exchange.getRequest().mutate();

                // UUID (subject) → X-User-Id (media-service 등에서 odUserId로 사용)
                String userId = claims.getSubject();
                if (userId != null) {
                    requestBuilder.header("X-User-Id", userId);
                }

                // 하위 호환용 UUID 별칭
                if (userId != null) {
                    requestBuilder.header("X-User-Uuid", userId);
                }

                // 내부 BIGINT ID (iid claim) → X-User-Internal-Id
                Object iid = claims.get("iid");
                if (iid != null) {
                    requestBuilder.header("X-User-Internal-Id", String.valueOf(((Number) iid).longValue()));
                }

                // 이메일
                String email = claims.get("email", String.class);
                if (email != null) {
                    requestBuilder.header("X-User-Email", email);
                }

                ServerHttpRequest mutatedRequest = requestBuilder.build();
                return chain.filter(exchange.mutate().request(mutatedRequest).build());

            } catch (Exception e) {
                log.debug("JWT parsing failed: {}", e.getMessage());
            }
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
