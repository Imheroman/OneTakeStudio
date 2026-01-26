# 간편 회원가입 및 인증 시스템 가이드

## 목차
1. [회원가입 시스템 개요](#회원가입-시스템-개요)
2. [User 테이블 설계](#user-테이블-설계)
3. [회원가입 API](#회원가입-api)
4. [로그인 API](#로그인-api)
5. [JWT 인증](#jwt-인증)
6. [프로필 관리](#프로필-관리)

---

## 회원가입 시스템 개요

OneTakeStudio는 **간편 회원가입** 방식을 채택합니다.

### 특징
- ✅ **아이디/비밀번호/닉네임**만으로 회원가입
- ✅ 빠른 회원가입 프로세스 (3개 필드만 입력)
- ✅ JWT 기반 인증
- ❌ 이메일 입력 불필요
- ❌ 이메일 인증 과정 없음
- ❌ 소셜 로그인 없음 (Google, Kakao, Naver)
- ❌ 비밀번호 찾기/재설정 기능 없음

### 사용자 정보
```
필수 정보:
  - username (아이디): 4-20자, 영문/숫자/언더스코어만 가능
  - password (비밀번호): 8자 이상, 영문/숫자/특수문자 조합 권장
  - nickname (닉네임): 2-20자, 한글/영문/숫자 가능

선택 정보:
  - profileImageUrl (프로필 이미지): 나중에 추가 가능
```

---

## User 테이블 설계

### MySQL DDL

```sql
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '사용자 고유 ID',
    username VARCHAR(20) UNIQUE NOT NULL COMMENT '아이디 (로그인용)',
    password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt 해시)',
    nickname VARCHAR(20) NOT NULL COMMENT '닉네임 (화면 표시용)',
    profile_image_url VARCHAR(500) COMMENT '프로필 이미지 URL (S3)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 필드 설명

| 필드 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `user_id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 사용자 고유 식별자 |
| `username` | VARCHAR(20) | UNIQUE, NOT NULL | 로그인용 아이디 (영문, 숫자, _ 만 허용) |
| `password` | VARCHAR(255) | NOT NULL | bcrypt 해시된 비밀번호 (60자) |
| `nickname` | VARCHAR(20) | NOT NULL | 화면에 표시될 닉네임 |
| `profile_image_url` | VARCHAR(500) | NULL | S3 프로필 이미지 URL (선택사항) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 가입일시 |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | 정보 수정일시 |

### 인덱스

```sql
-- 로그인 시 아이디로 빠른 조회
CREATE INDEX idx_username ON users(username);

-- 닉네임 중복 체크용 (필요 시)
CREATE INDEX idx_nickname ON users(nickname);
```

---

## 회원가입 API

### Endpoint
```
POST /api/auth/register
Content-Type: application/json
```

### Request Body
```json
{
  "username": "testuser",
  "password": "password123!",
  "nickname": "테스트유저"
}
```

### Validation Rules

#### username (아이디)
- **필수**: ✅
- **길이**: 4-20자
- **허용 문자**: 영문 소문자/대문자, 숫자, 언더스코어(_)
- **정규식**: `^[a-zA-Z0-9_]{4,20}$`
- **중복 체크**: ✅ (DB UNIQUE 제약)

#### password (비밀번호)
- **필수**: ✅
- **최소 길이**: 8자
- **권장 조합**: 영문 + 숫자 + 특수문자
- **저장 방식**: bcrypt 해싱 (strength=10)

#### nickname (닉네임)
- **필수**: ✅
- **길이**: 2-20자
- **허용 문자**: 한글, 영문, 숫자, 공백
- **비고**: 중복 허용 (같은 닉네임 가능)

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다."
}
```

#### Error (400 Bad Request) - 아이디 중복
```json
{
  "success": false,
  "error": "DUPLICATE_USERNAME",
  "message": "이미 사용 중인 아이디입니다."
}
```

#### Error (400 Bad Request) - Validation 실패
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "입력 정보가 올바르지 않습니다.",
  "details": {
    "username": "아이디는 4-20자의 영문, 숫자, 언더스코어만 가능합니다.",
    "password": "비밀번호는 최소 8자 이상이어야 합니다."
  }
}
```

### 구현 예시 (Spring Boot)

#### DTO
```java
package com.onetake.core.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    
    @NotBlank(message = "아이디는 필수입니다.")
    @Pattern(
        regexp = "^[a-zA-Z0-9_]{4,20}$",
        message = "아이디는 4-20자의 영문, 숫자, 언더스코어만 가능합니다."
    )
    private String username;
    
    @NotBlank(message = "비밀번호는 필수입니다.")
    @Size(min = 8, message = "비밀번호는 최소 8자 이상이어야 합니다.")
    private String password;
    
    @NotBlank(message = "닉네임은 필수입니다.")
    @Size(min = 2, max = 20, message = "닉네임은 2-20자여야 합니다.")
    private String nickname;
}
```

#### Controller
```java
package com.onetake.core.auth.controller;

import com.onetake.core.auth.dto.RegisterRequest;
import com.onetake.core.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    
    @PostMapping("/register")
    public ResponseEntity<ApiResponse> register(@RequestBody @Valid RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("회원가입이 완료되었습니다."));
    }
}
```

#### Service
```java
package com.onetake.core.auth.service;

import com.onetake.core.auth.dto.RegisterRequest;
import com.onetake.core.auth.exception.DuplicateUsernameException;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Transactional
    public void register(RegisterRequest request) {
        // 1. 아이디 중복 체크
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateUsernameException("이미 사용 중인 아이디입니다.");
        }
        
        // 2. 비밀번호 해싱
        String hashedPassword = passwordEncoder.encode(request.getPassword());
        
        // 3. User 엔티티 생성
        User user = User.builder()
                .username(request.getUsername())
                .password(hashedPassword)
                .nickname(request.getNickname())
                .build();
        
        // 4. 저장
        userRepository.save(user);
    }
}
```

#### Entity
```java
package com.onetake.core.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;
    
    @Column(name = "username", unique = true, nullable = false, length = 20)
    private String username;
    
    @Column(name = "password", nullable = false)
    private String password;
    
    @Column(name = "nickname", nullable = false, length = 20)
    private String nickname;
    
    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
```

#### Repository
```java
package com.onetake.core.user.repository;

import com.onetake.core.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByUsername(String username);
    
    boolean existsByUsername(String username);
}
```

---

## 로그인 API

### Endpoint
```
POST /api/auth/login
Content-Type: application/json
```

### Request Body
```json
{
  "username": "testuser",
  "password": "password123!"
}
```

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": 1,
      "username": "testuser",
      "nickname": "테스트유저",
      "profileImageUrl": null
    }
  }
}
```

#### Error (401 Unauthorized) - 로그인 실패
```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "아이디 또는 비밀번호가 올바르지 않습니다."
}
```

### 구현 예시

#### DTO
```java
package com.onetake.core.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    
    @NotBlank(message = "아이디를 입력해주세요.")
    private String username;
    
    @NotBlank(message = "비밀번호를 입력해주세요.")
    private String password;
}

@Data
@Builder
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private UserDto user;
}

@Data
@Builder
public class UserDto {
    private Long userId;
    private String username;
    private String nickname;
    private String profileImageUrl;
    
    public static UserDto from(User user) {
        return UserDto.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .profileImageUrl(user.getProfileImageUrl())
                .build();
    }
}
```

#### Service
```java
@Transactional(readOnly = true)
public LoginResponse login(LoginRequest request) {
    // 1. 아이디로 사용자 조회
    User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new InvalidCredentialsException(
                "아이디 또는 비밀번호가 올바르지 않습니다."
            ));
    
    // 2. 비밀번호 검증
    if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
        throw new InvalidCredentialsException(
            "아이디 또는 비밀번호가 올바르지 않습니다."
        );
    }
    
    // 3. JWT 토큰 발급
    String accessToken = jwtUtil.generateAccessToken(
        user.getUserId(),
        user.getUsername(),
        user.getNickname()
    );
    String refreshToken = jwtUtil.generateRefreshToken(user.getUserId());
    
    // 4. Refresh Token을 Redis에 저장 (7일 TTL)
    redisTemplate.opsForValue().set(
        "refresh_token:" + user.getUserId(),
        refreshToken,
        7, TimeUnit.DAYS
    );
    
    return LoginResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .user(UserDto.from(user))
            .build();
}
```

---

## JWT 인증

### JWT 구조

#### Access Token (유효기간: 1시간)
```json
{
  "sub": "123",              // User ID
  "username": "testuser",    // 아이디
  "nickname": "테스트유저",   // 닉네임
  "iat": 1609459200,         // 발급 시간
  "exp": 1609462800          // 만료 시간 (1시간 후)
}
```

#### Refresh Token (유효기간: 7일)
```json
{
  "sub": "123",              // User ID
  "type": "refresh",
  "iat": 1609459200,
  "exp": 1610064000          // 7일 후
}
```

### JwtUtil 구현

```java
package com.onetake.core.auth.util;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtUtil {
    
    @Value("${jwt.secret}")
    private String secret;
    
    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;
    
    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;
    
    public String generateAccessToken(Long userId, String username, String nickname) {
        return JWT.create()
                .withSubject(userId.toString())
                .withClaim("username", username)
                .withClaim("nickname", nickname)
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .sign(Algorithm.HMAC256(secret));
    }
    
    public String generateRefreshToken(Long userId) {
        return JWT.create()
                .withSubject(userId.toString())
                .withClaim("type", "refresh")
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + refreshTokenExpiration))
                .sign(Algorithm.HMAC256(secret));
    }
    
    public DecodedJWT verifyToken(String token) {
        return JWT.require(Algorithm.HMAC256(secret))
                .build()
                .verify(token);
    }
    
    public Long getUserId(String token) {
        DecodedJWT jwt = verifyToken(token);
        return Long.parseLong(jwt.getSubject());
    }
}
```

---

## 프로필 관리

### 닉네임 수정

#### Endpoint
```
PATCH /api/users/me/nickname
Authorization: Bearer {accessToken}
Content-Type: application/json
```

#### Request Body
```json
{
  "nickname": "새로운닉네임"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "닉네임이 수정되었습니다.",
  "data": {
    "nickname": "새로운닉네임"
  }
}
```

### 프로필 이미지 업로드

#### Endpoint
```
POST /api/users/me/profile-image
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

#### Request
```
file: (binary image file)
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "프로필 이미지가 업로드되었습니다.",
  "data": {
    "profileImageUrl": "https://s3.amazonaws.com/onetake/profiles/123.jpg"
  }
}
```

---

## 보안 고려사항

### 1. 비밀번호 해싱
- **알고리즘**: bcrypt
- **Strength**: 10 (2^10 = 1024 rounds)
- **솔트**: 자동 생성

```java
@Configuration
public class SecurityConfig {
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
```

### 2. JWT 보안
- **서명 알고리즘**: HMAC-SHA256
- **Secret Key**: 환경 변수로 관리 (최소 32자 이상)
- **토큰 만료**: Access Token 1시간, Refresh Token 7일

### 3. SQL Injection 방지
- JPA `@Query` 사용 시 Named Parameter 활용
- 사용자 입력값 Validation

### 4. XSS 방지
- 닉네임 입력 시 HTML 태그 필터링 (선택사항)

---

**이 문서는 OneTakeStudio의 간편 회원가입 시스템 전체 구현 가이드입니다.**
