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

3. **동일 이메일 계정 연동**: 같은 이메일로 다른 Provider 로그인 시 기존 계정에 자동 연동됨.
   - 예: Google로 가입 후 같은 이메일로 Naver 로그인 → 기존 계정의 provider가 NAVER로 업데이트
   - 마지막 로그인한 Provider가 기록됨

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

---

## 9. Authorization Code Flow 전환 (2026-01-27)

### 9.1 방식 변경 이유

기존 Frontend Token 방식에서 **Authorization Code Flow**로 전환했습니다.

- Frontend Token 방식: 프론트엔드가 OAuth Provider에서 Access Token을 받아 백엔드로 전달
- Authorization Code Flow: 프론트엔드가 Authorization Code만 받고, 백엔드가 Code를 Token으로 교환

```
[프론트엔드]                    [백엔드]                     [OAuth Provider]
     |                            |                              |
     |---(1) OAuth 인증 URL로 리다이렉트----------------------->|
     |<--(2) Authorization Code + state 파라미터 반환-----------|
     |                            |                              |
     |---(3) Code + redirectUri -->|                              |
     |                            |---(4) Code → Token 교환----->|
     |                            |<--(5) Access Token 발급------|
     |                            |---(6) 사용자 정보 조회------>|
     |                            |<--(7) 사용자 정보 응답-------|
     |<--(8) JWT 토큰 발급--------|                              |
```

### 9.2 추가된 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/oauth/google/callback` | Google Code 교환 |
| POST | `/api/auth/oauth/kakao/callback` | Kakao Code 교환 |
| POST | `/api/auth/oauth/naver/callback` | Naver Code 교환 |

**Request Body (OAuthCodeRequest):**
```json
{
  "code": "Authorization Code",
  "redirectUri": "http://localhost:3001/oauth/callback"
}
```

### 9.3 수정된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `OAuthService.java` | `exchangeGoogleCodeForToken()`, `exchangeKakaoCodeForToken()`, `exchangeNaverCodeForToken()` 추가 |
| `AuthService.java` | `oauthLoginGoogleWithCode()`, `oauthLoginKakaoWithCode()`, `oauthLoginNaverWithCode()` 추가 |
| `AuthController.java` | `/callback` 엔드포인트 3개 추가 |
| `OAuthCodeRequest.java` | 신규 DTO (code, redirectUri) |

---

## 10. CORS 문제 해결

### 10.1 redirect_uri_mismatch (Google)

**오류:**
```
redirect_uri_mismatch: The redirect URI in the request did not match a registered redirect URI.
```

**원인:** Google Cloud Console에 등록된 Redirect URI와 프론트엔드에서 보내는 URI 불일치

**해결:** Google Cloud Console → 사용자 인증 정보 → OAuth 2.0 클라이언트에 `http://localhost:3001/oauth/callback` 추가

### 10.2 CORS 헤더 중복

**오류:**
```
Access-Control-Allow-Origin header contains multiple values 'http://localhost:3001, http://localhost:3001'
```

**원인:** API Gateway와 Core Service 양쪽에서 CORS 헤더를 설정하여 중복 발생

**해결:** Core Service의 SecurityConfig에서 CORS 설정 제거, API Gateway에서만 CORS 처리
```java
// SecurityConfig.java - CORS 비활성화
http.cors(cors -> cors.disable())
```

### 10.3 403 Forbidden

**오류:** OAuth callback POST 요청 시 403 Forbidden

**원인:** Spring Security가 OAuth callback 엔드포인트를 차단

**해결:** SecurityConfig에서 `/api/auth/**` 경로 permitAll 확인
```java
.requestMatchers("/api/auth/**").permitAll()
```

---

## 11. 닉네임 UUID 표시 버그

**증상:** 로그인 후 워크스페이스에서 닉네임 대신 UUID가 표시됨

**원인:** `workspace/[id]/page.tsx`에서 `user?.name` 사용 → User 타입에 `name` 필드가 없어서 `undefined`, fallback으로 `userId`(UUID) 표시

**해결:**
```tsx
// Before
return <WorkspaceHome userId={userId} userName={user?.name} />;

// After
return <WorkspaceHome userId={userId} userName={user?.nickname} />;
```

---

## 12. Kakao OAuth 설정 및 오류

### 12.1 크리덴셜 설정

```yaml
# application.yml
oauth:
  kakao:
    client-id: 42b37ce2a41ca38644fa194c0b3d86bd     # REST API 키
    client-secret: C21YcsY9g9y1dlVnVTMCEm0IqosxHzGh  # 보안 → Client Secret
    redirect-uri: http://localhost:3001/oauth/callback
```

**주의:** Kakao Developers Console → 보안 탭에서 Client Secret을 별도로 발급받아야 합니다.

### 12.2 401 Unauthorized (Token Exchange 실패)

**오류:**
```
Kakao token exchange failed: 401 on POST request for "https://kauth.kakao.com/oauth/token": [no body]
```

**원인:** Kakao OAuth는 Client Secret이 필수. 초기에 Client Secret 없이 요청하여 401 발생.

**해결:** Kakao Developers Console → 보안 → Client Secret 발급 후 `application.yml`에 추가

### 12.3 Port 8081 충돌 (서비스 재시작 실패)

**오류:**
```
Port 8081 was already in use.
```

**원인:** 이전 Core Service 프로세스가 종료되지 않은 채 새 프로세스 시작 시도

**해결:**
```powershell
# 포트 사용 프로세스 PID 확인
(Get-NetTCPConnection -LocalPort 8081).OwningProcess

# 프로세스 강제 종료
Stop-Process -Id <PID> -Force
```

---

## 13. Naver OAuth 설정 및 오류

### 13.1 크리덴셜 설정

```yaml
# application.yml
oauth:
  naver:
    client-id: ID4xqmLVEISnoNshnvoH
    client-secret: QUGmPMFJqK
    redirect-uri: http://localhost:3001/oauth/callback
```

```env
# frontend/.env.local
NEXT_PUBLIC_NAVER_CLIENT_ID=ID4xqmLVEISnoNshnvoH
```

### 13.2 State 파라미터 JSON 파싱 오류

**오류:**
```
SyntaxError: Expected property name or '}' in JSON at position 1
```

**원인:** 프론트엔드에서 `state={"provider":"naver"}`를 URL-encoded로 전송하지만, Naver가 redirect 시 state를 HTML entity로 변환하여 반환:
```
# 전송한 state
state=%7B%22provider%22%3A%22naver%22%7D

# Naver가 반환한 state (HTML entity 포함)
state={&quot;provider&quot;:&quot;naver&quot;}
```

`&quot;`의 `&`가 URL 파라미터 구분자로 인식되어 `searchParams.get("state")`가 `{`만 반환. JSON 파싱 실패.

**해결:** state 파라미터를 JSON 대신 plain text provider 이름으로 변경:
```tsx
// Before (JSON - Naver에서 깨짐)
const state = encodeURIComponent(JSON.stringify({ provider }));

// After (plain text - 모든 Provider에서 안전)
const state = provider; // "google", "kakao", "naver"
```

콜백 페이지에서도 plain text 우선 파싱으로 변경:
```tsx
const validProviders = ["google", "kakao", "naver"];

if (validProviders.includes(stateParam)) {
  // plain text state (권장)
  provider = stateParam as "google" | "kakao" | "naver";
} else {
  // 레거시 JSON 형식 지원
  try {
    const state = JSON.parse(decodeURIComponent(stateParam));
    provider = state.provider;
  } catch { ... }
}
```

### 13.3 409 Conflict (동일 이메일 충돌)

**오류:**
```
POST http://localhost:8080/api/auth/oauth/naver/callback 409 (Conflict)
```

**원인:** Naver 계정의 이메일이 이미 Google/Kakao로 가입되어 있을 때, 기존 로직이 에러를 던짐:
```java
throw new AuthException(
    "이미 " + existing.getProvider() + " 계정으로 가입된 이메일입니다.",
    HttpStatus.CONFLICT);
```

**해결:** 동일 이메일이면 기존 계정에 새 OAuth 제공자를 연동하도록 변경:
```java
// Before: 409 에러
if (!existing.getProvider().equals(userInfo.getProvider())) {
    throw new AuthException("이미 " + existing.getProvider() + " 계정으로 가입...", CONFLICT);
}

// After: 기존 계정에 연동
user = userByEmail.get();
user.linkOAuthProvider(userInfo.getProvider(), userInfo.getProviderId());
if (userInfo.getProfileImageUrl() != null) {
    user.updateProfileImageUrl(userInfo.getProfileImageUrl());
}
userRepository.save(user);
```

`User.java`에 도메인 메서드 추가:
```java
public void linkOAuthProvider(String provider, String providerId) {
    this.provider = provider;
    this.providerId = providerId;
}
```

**참고:** 이 방식은 마지막으로 로그인한 OAuth 제공자로 provider가 덮어씌워집니다. 다중 제공자를 동시에 유지하려면 별도 테이블(user_oauth_providers)이 필요합니다.

---

## 14. Media Service 패키지 리팩토링

### 14.1 변경 내용

| 항목 | Before | After |
|------|--------|-------|
| 패키지 | `com.onetakestudio.mediaservice` | `com.onetake.media` |
| RabbitConfig | 존재 | 제거 |
| RedisStreamConfig | 없음 | 신규 추가 |

### 14.2 변경된 파일 수

- 58개 파일 변경 (rename + 코드 수정)
- 모든 import 경로가 `com.onetake.media`로 통일

---

## 15. 커밋 이력 (2026-01-27 추가분)

```
e8c14cf feat(fe/auth): OAuth state 파라미터 plain text 변환 및 콜백 파싱 개선
b2295b0 feat(auth): OAuth 동일 이메일 계정 연동 및 Kakao/Naver 크리덴셜 추가
dca9da6 feat(auth): OAuth Authorization Code Flow 구현 및 CORS 문제 해결
```

### be-dev 브랜치 (cherry-pick)
```
0251f43 refactor(media): 패키지 구조 변경 (com.onetakestudio.mediaservice -> com.onetake.media)
9859ca8 feat(auth): OAuth 동일 이메일 계정 연동 및 Kakao/Naver 크리덴셜 추가
```

---

*최종 수정일: 2026-01-27*
