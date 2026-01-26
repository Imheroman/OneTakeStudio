# Global 공통 클래스

## 1. ApiResponse (API 응답 포맷)

모든 API 응답을 통일된 형식으로 반환

### ApiResponse.java
```java
package com.onetakestudio.media.global.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final T data;
    private final String code;
    private final String message;

    /**
     * 성공 응답 (데이터 있음)
     */
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .build();
    }

    /**
     * 성공 응답 (데이터 없음)
     */
    public static <T> ApiResponse<T> success() {
        return ApiResponse.<T>builder()
                .success(true)
                .build();
    }

    /**
     * 성공 응답 (메시지 포함)
     */
    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .message(message)
                .build();
    }

    /**
     * 실패 응답
     */
    public static <T> ApiResponse<T> error(String code, String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .code(code)
                .message(message)
                .build();
    }
}
```

### 사용 예시
```java
// 성공 - 데이터 반환
return ResponseEntity.ok(ApiResponse.success(tokenResponse));

// 성공 - 데이터 없음
return ResponseEntity.ok(ApiResponse.success());

// 실패
return ResponseEntity.badRequest()
    .body(ApiResponse.error("R002", "이미 녹화 중입니다"));
```

### 응답 형식
```json
// 성공
{
  "success": true,
  "data": {
    "token": "eyJhbG...",
    "serverUrl": "ws://localhost:7880"
  }
}

// 실패
{
  "success": false,
  "code": "R002",
  "message": "이미 녹화 중입니다"
}
```

---

## 2. BaseTimeEntity (생성/수정 시간 자동 관리)

모든 Entity가 상속받아 사용

### BaseTimeEntity.java
```java
package com.onetakestudio.media.global.common;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.OffsetDateTime;

@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseTimeEntity {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

### JPA Auditing 활성화 (필수!)

```java
package com.onetakestudio.media.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
```

### 사용 예시
```java
@Entity
@Table(name = "recordings")
public class Recording extends BaseTimeEntity {
    // createdAt, updatedAt 자동 관리됨
    
    @Id
    private Long id;
    
    @Column(name = "recording_key", nullable = false, unique = true)
    private UUID recordingKey;
    
    private String title;
}
```

---

## 3. UserPrincipal (인증된 사용자 정보)

Spring Security에서 인증된 사용자 정보를 담는 클래스

### UserPrincipal.java
```java
package com.onetakestudio.media.global.security;

import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class UserPrincipal implements UserDetails {

    private final Long userId;
    private final String email;
    private final String role;

    /**
     * JWT에서 추출한 정보로 UserPrincipal 생성
     */
    public static UserPrincipal of(Long userId, String email, String role) {
        return UserPrincipal.builder()
                .userId(userId)
                .email(email)
                .role(role)
                .build();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
    }

    @Override
    public String getPassword() {
        return null;  // JWT 인증이라 비밀번호 없음
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
```

### Controller에서 사용
```java
@PostMapping("/token")
public ResponseEntity<ApiResponse<TokenResponse>> createToken(
        @AuthenticationPrincipal UserPrincipal user,  // 자동 주입
        @RequestBody TokenRequest request) {
    
    Long userId = user.getUserId();  // 현재 로그인한 사용자 ID
    // ...
}
```

---

## 4. JwtAuthenticationFilter (JWT 인증 필터)

요청마다 JWT 토큰 검증하고 UserPrincipal 생성

### JwtAuthenticationFilter.java
```java
package com.onetakestudio.media.global.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        
        // 1. 헤더에서 토큰 추출
        String token = resolveToken(request);

        // 2. 토큰 검증 & 인증 정보 설정
        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            // JWT에서 사용자 정보 추출
            Long userId = jwtTokenProvider.getUserId(token);
            String email = jwtTokenProvider.getEmail(token);
            String role = jwtTokenProvider.getRole(token);

            // UserPrincipal 생성
            UserPrincipal userPrincipal = UserPrincipal.of(userId, email, role);

            // SecurityContext에 인증 정보 저장
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userPrincipal,
                            null,
                            userPrincipal.getAuthorities()
                    );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            log.debug("인증 성공: userId={}", userId);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Authorization 헤더에서 Bearer 토큰 추출
     */
    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

### JwtTokenProvider.java (간단 버전)
```java
package com.onetakestudio.media.global.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey key;

    public JwtTokenProvider(@Value("${jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 토큰 유효성 검증
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            log.error("JWT 검증 실패: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 토큰에서 사용자 ID 추출
     */
    public Long getUserId(String token) {
        Claims claims = getClaims(token);
        return Long.parseLong(claims.getSubject());
    }

    /**
     * 토큰에서 이메일 추출
     */
    public String getEmail(String token) {
        Claims claims = getClaims(token);
        return claims.get("email", String.class);
    }

    /**
     * 토큰에서 역할 추출
     */
    public String getRole(String token) {
        Claims claims = getClaims(token);
        return claims.get("role", String.class);
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
```

---

## 5. SecurityConfig (보안 설정)

### SecurityConfig.java
```java
package com.onetakestudio.media.global.config;

import com.onetakestudio.media.global.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF 비활성화 (REST API라서)
            .csrf(AbstractHttpConfigurer::disable)
            
            // 세션 사용 안 함 (JWT 사용)
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // URL별 권한 설정
            .authorizeHttpRequests(auth -> auth
                // 인증 없이 접근 가능
                .requestMatchers("/webhooks/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                
                // 나머지는 인증 필요
                .anyRequest().authenticated()
            )
            
            // JWT 필터 추가
            .addFilterBefore(jwtAuthenticationFilter, 
                             UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

---

## 6. application.yml 설정 추가

```yaml
# JWT 설정 추가
jwt:
  secret: your-256-bit-secret-key-here-must-be-at-least-32-characters
```
