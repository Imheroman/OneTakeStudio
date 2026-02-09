# 이메일 기반 회원가입 및 인증 시스템 가이드

## 목차
1. [회원가입 시스템 개요](#회원가입-시스템-개요)
2. [User 테이블 설계](#user-테이블-설계)
3. [이메일 인증 테이블 설계](#이메일-인증-테이블-설계)
4. [회원가입 API](#회원가입-api)
5. [이메일 인증 API](#이메일-인증-api)
6. [로그인 API](#로그인-api)
7. [비밀번호 재설정 API](#비밀번호-재설정-api)
8. [JWT 인증](#jwt-인증)
9. [이메일 발송 서비스](#이메일-발송-서비스)

---

## 회원가입 시스템 개요

OneTakeStudio는 **이메일 기반 회원가입** 방식을 채택합니다.

### 특징
- ✅ **이메일/비밀번호/닉네임**으로 회원가입
- ✅ 이메일 인증 필수 (6자리 인증 코드)
- ✅ 이메일로 로그인
- ✅ 비밀번호 찾기/재설정 지원
- ✅ JWT 기반 인증
- ❌ 소셜 로그인 없음 (Google, Kakao, Naver) - 추후 추가 가능

### 회원가입 흐름
```
1. 사용자가 이메일, 비밀번호, 닉네임 입력
2. 서버에서 이메일로 6자리 인증 코드 발송
3. 사용자가 인증 코드 입력
4. 인증 완료 시 email_verified = true로 변경
5. 이메일 인증된 사용자만 로그인 가능
```

### 사용자 정보
```
필수 정보:
  - email (이메일): 유효한 이메일 형식, 로그인 ID로 사용
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
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '내부 PK (조인용)',
    user_id CHAR(36) UNIQUE NOT NULL COMMENT '외부 노출 UUID',
    email VARCHAR(255) UNIQUE NOT NULL COMMENT '이메일 (로그인 ID)',
    password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt 해시)',
    nickname VARCHAR(50) NOT NULL COMMENT '닉네임 (화면 표시용)',
    profile_image_url VARCHAR(500) COMMENT '프로필 이미지 URL (S3)',
    email_verified BOOLEAN DEFAULT FALSE COMMENT '이메일 인증 완료 여부',
    is_active BOOLEAN DEFAULT TRUE COMMENT '계정 활성화 여부',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '가입일시',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

    INDEX idx_user_id (user_id),
    INDEX idx_email (email),
    INDEX idx_email_verified (email_verified),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 필드 설명

| 필드 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 내부 조인용 PK |
| `user_id` | CHAR(36) | UNIQUE, NOT NULL | 외부 API 노출용 UUID |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | 로그인용 이메일 |
| `password` | VARCHAR(255) | NOT NULL | bcrypt 해시된 비밀번호 (60자) |
| `nickname` | VARCHAR(50) | NOT NULL | 화면에 표시될 닉네임 |
| `profile_image_url` | VARCHAR(500) | NULL | S3 프로필 이미지 URL |
| `email_verified` | BOOLEAN | DEFAULT FALSE | 이메일 인증 완료 여부 |
| `is_active` | BOOLEAN | DEFAULT TRUE | 계정 활성화 여부 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 가입일시 |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 정보 수정일시 |

### Java Entity

```java
package com.onetake.core.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true, nullable = false, length = 36)
    private String userId;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String nickname;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (userId == null) {
            userId = UUID.randomUUID().toString();
        }
    }
}
```

---

## 이메일 인증 테이블 설계

### email_verifications 테이블 (인증 코드 저장)

```sql
CREATE TABLE email_verifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL COMMENT '인증 대상 이메일',
    verification_code VARCHAR(6) NOT NULL COMMENT '6자리 인증 코드',
    type VARCHAR(20) NOT NULL COMMENT 'SIGNUP/PASSWORD_RESET',
    expires_at DATETIME NOT NULL COMMENT '만료 시간 (발급 후 5분)',
    verified BOOLEAN DEFAULT FALSE COMMENT '인증 완료 여부',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_code (verification_code),
    INDEX idx_type (type),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### password_reset_tokens 테이블 (비밀번호 재설정)

```sql
CREATE TABLE password_reset_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT 'users.id (FK)',
    token CHAR(36) UNIQUE NOT NULL COMMENT 'UUID 토큰',
    expires_at DATETIME NOT NULL COMMENT '만료 시간 (발급 후 1시간)',
    used BOOLEAN DEFAULT FALSE COMMENT '사용 완료 여부',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Java Entity - EmailVerification

```java
package com.onetake.core.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_verifications")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(name = "verification_code", nullable = false, length = 6)
    private String verificationCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationType type;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column
    @Builder.Default
    private Boolean verified = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}

public enum VerificationType {
    SIGNUP, PASSWORD_RESET
}
```

### Java Entity - PasswordResetToken

```java
package com.onetake.core.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "password_reset_tokens")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(unique = true, nullable = false, length = 36)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column
    @Builder.Default
    private Boolean used = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (token == null) {
            token = UUID.randomUUID().toString();
        }
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
```

---

## 회원가입 API

### Step 1: 회원가입 요청 (인증 코드 발송)

#### Endpoint
```
POST /api/auth/register
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "password123!",
  "nickname": "테스트유저"
}
```

#### Validation Rules

##### email (이메일)
- **필수**: ✅
- **형식**: 유효한 이메일 형식
- **정규식**: `^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$`
- **중복 체크**: ✅ (DB UNIQUE 제약)

##### password (비밀번호)
- **필수**: ✅
- **최소 길이**: 8자
- **권장 조합**: 영문 + 숫자 + 특수문자
- **저장 방식**: bcrypt 해싱 (strength=10)

##### nickname (닉네임)
- **필수**: ✅
- **길이**: 2-20자
- **허용 문자**: 한글, 영문, 숫자, 공백
- **비고**: 중복 허용 (같은 닉네임 가능)

#### Response

##### Success (200 OK)
```json
{
  "success": true,
  "message": "인증 코드가 이메일로 발송되었습니다. 5분 내에 인증해주세요."
}
```

##### Error (400 Bad Request) - 이메일 중복
```json
{
  "success": false,
  "error": "DUPLICATE_EMAIL",
  "message": "이미 가입된 이메일입니다."
}
```

##### Error (400 Bad Request) - Validation 실패
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "입력 정보가 올바르지 않습니다.",
  "details": {
    "email": "유효한 이메일 형식이 아닙니다.",
    "password": "비밀번호는 최소 8자 이상이어야 합니다."
  }
}
```

---

### Step 2: 이메일 인증 코드 확인

#### Endpoint
```
POST /api/auth/verify-email
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

#### Response

##### Success (200 OK)
```json
{
  "success": true,
  "message": "이메일 인증이 완료되었습니다. 로그인해주세요."
}
```

##### Error (400 Bad Request) - 코드 불일치/만료
```json
{
  "success": false,
  "error": "INVALID_VERIFICATION_CODE",
  "message": "인증 코드가 올바르지 않거나 만료되었습니다."
}
```

---

### Step 3: 인증 코드 재발송

#### Endpoint
```
POST /api/auth/resend-verification
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "user@example.com"
}
```

#### Response

##### Success (200 OK)
```json
{
  "success": true,
  "message": "인증 코드가 재발송되었습니다."
}
```

---

## 구현 예시 (Spring Boot)

### DTO

```java
package com.onetake.core.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "유효한 이메일 형식이 아닙니다.")
    private String email;

    @NotBlank(message = "비밀번호는 필수입니다.")
    @Size(min = 8, message = "비밀번호는 최소 8자 이상이어야 합니다.")
    private String password;

    @NotBlank(message = "닉네임은 필수입니다.")
    @Size(min = 2, max = 20, message = "닉네임은 2-20자여야 합니다.")
    private String nickname;
}

@Data
public class VerifyEmailRequest {

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "유효한 이메일 형식이 아닙니다.")
    private String email;

    @NotBlank(message = "인증 코드는 필수입니다.")
    @Size(min = 6, max = 6, message = "인증 코드는 6자리입니다.")
    private String code;
}

@Data
public class ResendVerificationRequest {

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "유효한 이메일 형식이 아닙니다.")
    private String email;
}
```

### Controller

```java
package com.onetake.core.auth.controller;

import com.onetake.core.auth.dto.*;
import com.onetake.core.auth.service.AuthService;
import com.onetake.core.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // Step 1: 회원가입 (인증 코드 발송)
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@RequestBody @Valid RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("인증 코드가 이메일로 발송되었습니다. 5분 내에 인증해주세요."));
    }

    // Step 2: 이메일 인증 코드 확인
    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestBody @Valid VerifyEmailRequest request) {
        authService.verifyEmail(request);
        return ResponseEntity.ok(ApiResponse.success("이메일 인증이 완료되었습니다. 로그인해주세요."));
    }

    // Step 3: 인증 코드 재발송
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<Void>> resendVerification(@RequestBody @Valid ResendVerificationRequest request) {
        authService.resendVerificationCode(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("인증 코드가 재발송되었습니다."));
    }

    // 로그인
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@RequestBody @Valid LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
```

### Service

```java
package com.onetake.core.auth.service;

import com.onetake.core.auth.dto.*;
import com.onetake.core.auth.entity.EmailVerification;
import com.onetake.core.auth.entity.VerificationType;
import com.onetake.core.auth.exception.*;
import com.onetake.core.auth.repository.EmailVerificationRepository;
import com.onetake.core.auth.util.JwtUtil;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;

    private static final int VERIFICATION_CODE_LENGTH = 6;
    private static final int VERIFICATION_EXPIRY_MINUTES = 5;

    @Transactional
    public void register(RegisterRequest request) {
        // 1. 이메일 중복 체크
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("이미 가입된 이메일입니다.");
        }

        // 2. 비밀번호 해싱
        String hashedPassword = passwordEncoder.encode(request.getPassword());

        // 3. User 엔티티 생성 (email_verified = false)
        User user = User.builder()
                .email(request.getEmail())
                .password(hashedPassword)
                .nickname(request.getNickname())
                .emailVerified(false)
                .build();

        userRepository.save(user);

        // 4. 인증 코드 생성 및 저장
        String verificationCode = generateVerificationCode();
        EmailVerification verification = EmailVerification.builder()
                .email(request.getEmail())
                .verificationCode(verificationCode)
                .type(VerificationType.SIGNUP)
                .expiresAt(LocalDateTime.now().plusMinutes(VERIFICATION_EXPIRY_MINUTES))
                .verified(false)
                .build();

        emailVerificationRepository.save(verification);

        // 5. 이메일 발송
        emailService.sendVerificationEmail(request.getEmail(), verificationCode);
    }

    @Transactional
    public void verifyEmail(VerifyEmailRequest request) {
        // 1. 인증 코드 조회
        EmailVerification verification = emailVerificationRepository
                .findByEmailAndVerificationCodeAndTypeAndVerifiedFalse(
                        request.getEmail(),
                        request.getCode(),
                        VerificationType.SIGNUP
                )
                .orElseThrow(() -> new InvalidVerificationCodeException(
                        "인증 코드가 올바르지 않거나 만료되었습니다."
                ));

        // 2. 만료 체크
        if (verification.isExpired()) {
            throw new InvalidVerificationCodeException("인증 코드가 만료되었습니다. 재발송을 요청해주세요.");
        }

        // 3. 인증 완료 처리
        verification.setVerified(true);
        emailVerificationRepository.save(verification);

        // 4. 사용자 이메일 인증 완료 처리
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    @Transactional
    public void resendVerificationCode(String email) {
        // 1. 사용자 존재 확인
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("가입된 이메일이 아닙니다."));

        // 2. 이미 인증된 경우
        if (user.getEmailVerified()) {
            throw new AlreadyVerifiedException("이미 인증된 이메일입니다.");
        }

        // 3. 기존 인증 코드 무효화 (옵션)
        emailVerificationRepository.deleteByEmailAndType(email, VerificationType.SIGNUP);

        // 4. 새 인증 코드 생성
        String verificationCode = generateVerificationCode();
        EmailVerification verification = EmailVerification.builder()
                .email(email)
                .verificationCode(verificationCode)
                .type(VerificationType.SIGNUP)
                .expiresAt(LocalDateTime.now().plusMinutes(VERIFICATION_EXPIRY_MINUTES))
                .verified(false)
                .build();

        emailVerificationRepository.save(verification);

        // 5. 이메일 발송
        emailService.sendVerificationEmail(email, verificationCode);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        // 1. 이메일로 사용자 조회
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException(
                        "이메일 또는 비밀번호가 올바르지 않습니다."
                ));

        // 2. 이메일 인증 확인
        if (!user.getEmailVerified()) {
            throw new EmailNotVerifiedException("이메일 인증이 완료되지 않았습니다.");
        }

        // 3. 비밀번호 검증
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        // 4. JWT 토큰 발급
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getNickname());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(UserDto.from(user))
                .build();
    }

    private String generateVerificationCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < VERIFICATION_CODE_LENGTH; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }
}
```

### Repository

```java
package com.onetake.core.user.repository;

import com.onetake.core.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUserId(String userId);

    boolean existsByEmail(String email);
}
```

```java
package com.onetake.core.auth.repository;

import com.onetake.core.auth.entity.EmailVerification;
import com.onetake.core.auth.entity.VerificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findByEmailAndVerificationCodeAndTypeAndVerifiedFalse(
            String email, String verificationCode, VerificationType type
    );

    void deleteByEmailAndType(String email, VerificationType type);
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
  "email": "user@example.com",
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
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
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
  "message": "이메일 또는 비밀번호가 올바르지 않습니다."
}
```

#### Error (403 Forbidden) - 이메일 미인증
```json
{
  "success": false,
  "error": "EMAIL_NOT_VERIFIED",
  "message": "이메일 인증이 완료되지 않았습니다."
}
```

### DTO

```java
@Data
public class LoginRequest {

    @NotBlank(message = "이메일을 입력해주세요.")
    @Email(message = "유효한 이메일 형식이 아닙니다.")
    private String email;

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
    private String userId;  // UUID (외부 노출용)
    private String email;
    private String nickname;
    private String profileImageUrl;

    public static UserDto from(User user) {
        return UserDto.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .profileImageUrl(user.getProfileImageUrl())
                .build();
    }
}
```

---

## 비밀번호 재설정 API

### Step 1: 비밀번호 재설정 요청 (이메일 발송)

#### Endpoint
```
POST /api/auth/forgot-password
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "user@example.com"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "비밀번호 재설정 링크가 이메일로 발송되었습니다."
}
```

### Step 2: 비밀번호 재설정

#### Endpoint
```
POST /api/auth/reset-password
Content-Type: application/json
```

#### Request Body
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "newPassword": "newPassword123!"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요."
}
```

### Service 구현

```java
@Transactional
public void forgotPassword(String email) {
    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("가입된 이메일이 아닙니다."));

    // 기존 토큰 무효화
    passwordResetTokenRepository.deleteByUserId(user.getId());

    // 새 토큰 생성
    PasswordResetToken resetToken = PasswordResetToken.builder()
            .userId(user.getId())
            .expiresAt(LocalDateTime.now().plusHours(1))
            .used(false)
            .build();

    passwordResetTokenRepository.save(resetToken);

    // 이메일 발송 (재설정 링크 포함)
    String resetLink = "https://onetakestudio.com/reset-password?token=" + resetToken.getToken();
    emailService.sendPasswordResetEmail(email, resetLink);
}

@Transactional
public void resetPassword(ResetPasswordRequest request) {
    PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
            .orElseThrow(() -> new InvalidTokenException("유효하지 않은 토큰입니다."));

    if (resetToken.isExpired()) {
        throw new InvalidTokenException("토큰이 만료되었습니다.");
    }

    if (resetToken.getUsed()) {
        throw new InvalidTokenException("이미 사용된 토큰입니다.");
    }

    User user = userRepository.findById(resetToken.getUserId())
            .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));

    // 비밀번호 변경
    user.setPassword(passwordEncoder.encode(request.getNewPassword()));
    userRepository.save(user);

    // 토큰 사용 처리
    resetToken.setUsed(true);
    passwordResetTokenRepository.save(resetToken);
}
```

---

## JWT 인증

### JWT 구조

#### Access Token (유효기간: 1시간)
```json
{
  "sub": "123",              // User ID (내부 PK)
  "userId": "550e8400...",   // User UUID (외부 노출용)
  "email": "user@example.com",
  "nickname": "테스트유저",
  "iat": 1609459200,
  "exp": 1609462800
}
```

#### Refresh Token (유효기간: 7일)
```json
{
  "sub": "123",
  "type": "refresh",
  "iat": 1609459200,
  "exp": 1610064000
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
    private long accessTokenExpiration;  // 3600000 (1시간)

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;  // 604800000 (7일)

    public String generateAccessToken(Long id, String email, String nickname) {
        return JWT.create()
                .withSubject(id.toString())
                .withClaim("email", email)
                .withClaim("nickname", nickname)
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .sign(Algorithm.HMAC256(secret));
    }

    public String generateRefreshToken(Long id) {
        return JWT.create()
                .withSubject(id.toString())
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

    public String getEmail(String token) {
        DecodedJWT jwt = verifyToken(token);
        return jwt.getClaim("email").asString();
    }
}
```

---

## 이메일 발송 서비스

### EmailService 구현 (Spring Mail)

```java
package com.onetake.core.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendVerificationEmail(String to, String verificationCode) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("[OneTakeStudio] 이메일 인증 코드");
            helper.setText(buildVerificationEmailContent(verificationCode), true);

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("이메일 발송에 실패했습니다.", e);
        }
    }

    public void sendPasswordResetEmail(String to, String resetLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("[OneTakeStudio] 비밀번호 재설정");
            helper.setText(buildPasswordResetEmailContent(resetLink), true);

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("이메일 발송에 실패했습니다.", e);
        }
    }

    private String buildVerificationEmailContent(String code) {
        return """
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>OneTakeStudio 이메일 인증</h2>
                <p>아래 인증 코드를 입력해주세요:</p>
                <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
                    %s
                </div>
                <p style="color: #666; margin-top: 20px;">
                    이 코드는 5분간 유효합니다.<br>
                    본인이 요청하지 않은 경우 이 메일을 무시해주세요.
                </p>
            </body>
            </html>
            """.formatted(code);
    }

    private String buildPasswordResetEmailContent(String resetLink) {
        return """
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>OneTakeStudio 비밀번호 재설정</h2>
                <p>아래 버튼을 클릭하여 비밀번호를 재설정해주세요:</p>
                <a href="%s" style="display: inline-block; background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                    비밀번호 재설정
                </a>
                <p style="color: #666; margin-top: 20px;">
                    이 링크는 1시간 동안 유효합니다.<br>
                    본인이 요청하지 않은 경우 이 메일을 무시해주세요.
                </p>
            </body>
            </html>
            """.formatted(resetLink);
    }
}
```

### application.yml 설정

```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
            required: true
```

---

## 보안 고려사항

### 1. 비밀번호 해싱
- **알고리즘**: bcrypt
- **Strength**: 10 (2^10 = 1024 rounds)
- **솔트**: 자동 생성

### 2. 인증 코드 보안
- **길이**: 6자리 숫자
- **유효시간**: 5분
- **재시도 제한**: 동일 이메일로 1분 내 재발송 불가 (옵션)

### 3. 비밀번호 재설정 토큰
- **형식**: UUID (추측 불가)
- **유효시간**: 1시간
- **일회성**: 사용 후 무효화

### 4. Rate Limiting (권장)
```java
@RateLimiter(name = "emailRateLimiter", fallbackMethod = "rateLimitFallback")
public void sendVerificationEmail(String email, String code) {
    // ...
}
```

---

## API 요약

| 메서드 | URL | 설명 |
|--------|-----|------|
| POST | /api/auth/register | 회원가입 (인증 코드 발송) |
| POST | /api/auth/verify-email | 이메일 인증 코드 확인 |
| POST | /api/auth/resend-verification | 인증 코드 재발송 |
| POST | /api/auth/login | 로그인 |
| POST | /api/auth/forgot-password | 비밀번호 재설정 요청 |
| POST | /api/auth/reset-password | 비밀번호 재설정 |
| POST | /api/auth/refresh | 토큰 갱신 |
| POST | /api/auth/logout | 로그아웃 |

---

**이 문서는 OneTakeStudio의 이메일 기반 회원가입 및 인증 시스템 전체 구현 가이드입니다.**
