# OAuth 소셜 로그인 구현 가이드

## 개요

OneTakeStudio Core Service에 Google, Kakao, Naver OAuth 소셜 로그인 기능을 구현한 과정을 정리한 문서입니다.

---

## 1. 구현 방식

### 1.1 Frontend Token 방식 채택

OAuth 구현 방식 중 **Frontend Token 방식**을 선택했습니다.

```
[프론트엔드]                    [백엔드]                     [OAuth Provider]
     |                            |                              |
     |---(1) OAuth 로그인 요청--->|                              |
     |<--(2) 리다이렉트 URL-------|                              |
     |                            |                              |
     |---(3) 사용자 로그인/동의-------------------------->       |
     |<--(4) Access Token 발급--------------------------        |
     |                            |                              |
     |---(5) Access Token 전달--->|                              |
     |                            |---(6) 사용자 정보 조회------>|
     |                            |<--(7) 사용자 정보 응답-------|
     |<--(8) JWT 토큰 발급--------|                              |
```

**장점:**
- 백엔드에 Client Secret 저장 불필요 (보안 향상)
- 프론트엔드에서 OAuth SDK 활용 가능
- 구현이 상대적으로 단순

### 1.2 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/oauth/google` | Google 로그인 |
| POST | `/api/auth/oauth/kakao` | Kakao 로그인 |
| POST | `/api/auth/oauth/naver` | Naver 로그인 |

**Request Body:**
```json
{
  "accessToken": "OAuth Provider에서 발급받은 Access Token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google 로그인 성공",
  "data": {
    "accessToken": "JWT Access Token",
    "refreshToken": "JWT Refresh Token",
    "user": {
      "userId": "UUID",
      "email": "user@example.com",
      "nickname": "사용자명",
      "profileImageUrl": "https://..."
    }
  }
}
```

---

## 2. 구현된 파일 목록

### 2.1 신규 생성 파일

| 파일 | 설명 |
|------|------|
| `AuthProvider.java` | OAuth 제공자 enum (LOCAL, GOOGLE, KAKAO, NAVER) |
| `OAuthLoginRequest.java` | OAuth 로그인 요청 DTO |
| `OAuthUserInfo.java` | OAuth 사용자 정보 DTO |
| `OAuthService.java` | OAuth Provider API 호출 서비스 |
| `RestTemplateConfig.java` | RestTemplate 빈 설정 |

### 2.2 수정된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `User.java` | provider, providerId 필드 추가, password nullable |
| `UserRepository.java` | findByUserId, findByProviderAndProviderId 메서드 추가 |
| `AuthService.java` | OAuth 로그인 메서드 추가 |
| `AuthController.java` | OAuth 엔드포인트 추가 |
| `AuthException.java` | OAuth 관련 예외 추가 |
| `JwtUtil.java` | userId 타입 Long → String 변경 |
| `CustomUserDetails.java` | userId 타입 Long → String 변경 |
| `JwtAuthenticationFilter.java` | userId 타입 변경 반영 |
| `UserService.java` | findByUserId 사용으로 변경 |
| `UserController.java` | userId PathVariable 타입 변경 |
| `UserProfileResponse.java` | userId 타입 Long → String 변경 |
| `LoginResponse.java` | UserDto.userId 타입 Long → String 변경 |
| `PasswordResetTokenRepository.java` | userId 파라미터 타입 변경 |
| `PasswordResetService.java` | updatePassword 메서드 사용 |
| `auth-test.html` | OAuth 로그인 테스트 UI 추가 |
| `application.yml` | 메일 설정 |

---

## 3. 발생한 오류 및 해결 방법

### 3.1 JwtUtil NoSuchMethodError

**오류:**
```
java.lang.NoSuchMethodError: 'java.lang.String com.onetake.common.jwt.JwtUtil.generateAccessToken(java.lang.String, java.lang.String, java.lang.String)'
```

**원인:**
- `JwtUtil`의 `generateAccessToken` 메서드 시그니처를 `Long userId` → `String userId`로 변경
- `common` 모듈이 재컴파일되지 않아 이전 버전의 클래스가 사용됨

**해결:**
```bash
# common 모듈을 clean 후 install하여 로컬 maven 저장소에 반영
mvn clean install -pl common -am -DskipTests

# 이후 core-service 실행
cd core-service && mvn spring-boot:run
```

### 3.2 데이터베이스 스키마 불일치

**오류:**
```
Unknown column 'u1_0.id' in 'field list'
```

**원인:**
- 기존 DB 테이블은 `user_id`(BIGINT)를 Primary Key로 사용
- Entity는 `id`(Long)를 Primary Key, `userId`(String UUID)를 외부 식별자로 사용

**해결:**
```bash
# 기존 테이블 삭제 후 Hibernate가 재생성하도록 함
docker exec onetakestudio-mysql mysql -ucore_user -pcore_password core_db \
  -e "SET FOREIGN_KEY_CHECKS=0; DROP TABLE IF EXISTS password_reset_tokens, email_verifications, users; SET FOREIGN_KEY_CHECKS=1;"

# 서버 재시작하면 Hibernate ddl-auto=update가 테이블 생성
```

**최종 스키마:**
```
+-------------------+--------------+------+-----+---------+----------------+
| Field             | Type         | Null | Key | Default | Extra          |
+-------------------+--------------+------+-----+---------+----------------+
| id                | bigint       | NO   | PRI | NULL    | auto_increment |
| user_id           | varchar(36)  | NO   | UNI | NULL    |                |
| email             | varchar(100) | NO   | UNI | NULL    |                |
| password          | varchar(255) | YES  |     | NULL    |                |
| nickname          | varchar(20)  | NO   |     | NULL    |                |
| provider          | varchar(20)  | YES  |     | NULL    |                |
| provider_id       | varchar(100) | YES  |     | NULL    |                |
| profile_image_url | varchar(500) | YES  |     | NULL    |                |
| email_verified    | bit(1)       | NO   |     | NULL    |                |
| is_active         | bit(1)       | NO   |     | NULL    |                |
| created_at        | datetime(6)  | NO   |     | NULL    |                |
| updated_at        | datetime(6)  | NO   |     | NULL    |                |
+-------------------+--------------+------+-----+---------+----------------+
```

### 3.3 포트 충돌 (Port 8080 already in use)

**오류:**
```
Web server failed to start. Port 8080 was already in use.
```

**해결:**
```bash
# Windows에서 포트 사용 프로세스 확인
netstat -ano | findstr :8080

# 해당 PID 프로세스 종료
cmd //c "taskkill /PID <PID> /F"
```

### 3.4 MAIL_USERNAME 환경변수 미설정

**오류:**
```
Could not resolve placeholder 'MAIL_USERNAME' in value "${MAIL_USERNAME}"
```

**해결:**
`application.yml`에 기본값 설정 또는 실제 값 직접 입력:
```yaml
spring:
  mail:
    username: ${MAIL_USERNAME:default@naver.com}
    password: ${MAIL_PASSWORD:defaultpassword}
```

---

## 4. OAuth Provider 설정

### 4.1 Google

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. API 및 서비스 → 사용자 인증 정보
4. OAuth 2.0 클라이언트 ID 생성
5. 승인된 리디렉션 URI 설정

**테스트용 Access Token 발급:**
1. [OAuth Playground](https://developers.google.com/oauthplayground/) 접속
2. Google OAuth2 API v2 → userinfo.email, userinfo.profile 선택
3. Authorize APIs → Exchange authorization code for tokens
4. Access Token 복사

### 4.2 Kakao

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. 애플리케이션 추가
3. 앱 키 → REST API 키 확인
4. 카카오 로그인 활성화
5. Redirect URI 등록
6. 동의항목 설정 (닉네임, 프로필 사진, 이메일)

### 4.3 Naver

1. [Naver Developers](https://developers.naver.com/) 접속
2. 애플리케이션 등록
3. Client ID, Client Secret 확인
4. API 설정 → 네이버 로그인 Callback URL 등록
5. 필수 제공 정보 설정 (이메일, 별명, 프로필 사진)

---

## 5. 테스트 방법

### 5.1 테스트 페이지

서버 실행 후 브라우저에서 접속:
```
http://localhost:8080/auth-test.html
```

### 5.2 cURL 테스트

```bash
# Google OAuth 로그인
curl -X POST http://localhost:8080/api/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_GOOGLE_ACCESS_TOKEN"}'

# Kakao OAuth 로그인
curl -X POST http://localhost:8080/api/auth/oauth/kakao \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_KAKAO_ACCESS_TOKEN"}'

# Naver OAuth 로그인
curl -X POST http://localhost:8080/api/auth/oauth/naver \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_NAVER_ACCESS_TOKEN"}'
```

---

## 6. 프론트엔드 연동 가이드

프론트엔드에서 OAuth 로그인 구현 시:

```javascript
// 1. OAuth Provider SDK로 로그인하여 Access Token 획득
// (Google, Kakao, Naver 각각의 SDK 사용)

// 2. 백엔드 API 호출
const response = await fetch('/api/auth/oauth/google', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    accessToken: googleAccessToken
  })
});

const data = await response.json();

if (data.success) {
  // 3. JWT 토큰 저장
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);

  // 4. 사용자 정보 활용
  console.log('User:', data.data.user);
}
```

---

## 7. 주의사항

1. **Access Token 만료**: OAuth Provider의 Access Token은 짧은 시간 후 만료됨. 테스트 시 새로 발급 필요.

2. **이메일 필수**: 소셜 로그인 시 이메일 정보 제공에 동의하지 않으면 로그인 실패.

3. **중복 가입 방지**: 같은 이메일로 다른 Provider로 가입 시도하면 에러 발생.
   - 예: Google로 가입 후 같은 이메일로 Kakao 가입 시도 → "이미 GOOGLE 계정으로 가입된 이메일입니다."

4. **닉네임 자동 생성**: 닉네임 중복 시 자동으로 숫자 suffix 추가 (예: 홍길동 → 홍길동1)

---

## 8. 커밋 이력

```
5c2e453 feat(auth): OAuth 소셜 로그인 구현 (Google, Kakao, Naver)
caabc96 merge: resolve conflict in UserRepository (email-based auth)
60bf4af feat(auth): 이메일 기반 회원가입 및 인증 시스템 구현
```

---

*작성일: 2026-01-26*
