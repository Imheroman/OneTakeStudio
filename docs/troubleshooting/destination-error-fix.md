# Destination 기능 오류 해결 정리

## 문제 1: Spring Security URL 패턴 파싱 오류

### 오류 메시지
```
java.lang.IllegalArgumentException: This is not supported: please use
'{*...}' or '**' only as the last path element if you wish to capture
all remaining path elements
```
또는
```
PatternParseException: {*...} or ** pattern elements should be placed
at the start or end of the pattern
```

### 오류 판별법
- 메시지에 **"PatternParseException"** 또는 **"** pattern elements"** 키워드가 있음
- 서버 시작 시점 또는 첫 요청 시 발생
- 500 Internal Server Error로 나타남

### 원인
Spring Security 6.x 버전에서 URL 패턴 규칙이 변경됨. `**` (다중 경로 와일드카드)는 패턴의 시작 또는 끝에만 위치해야 함.

잘못된 패턴: `/api/**/internal/**` - `**`가 경로 중간에 위치

### 해결책
`**`를 `*` (단일 경로 세그먼트 와일드카드)로 변경하여 경로 중간에 사용 가능하게 함

### 구체적인 해결 방법
**파일:** `core-service/src/main/java/com/onetake/core/config/SecurityConfig.java`

```java
// 수정 전
.requestMatchers(
    "/api/auth/**",
    "/api/**/internal/**",  // 오류 발생
    "/actuator/health",
    "/error"
).permitAll()

// 수정 후
.requestMatchers(
    "/api/auth/**",
    "/api/*/internal/**",   // * 는 단일 경로 세그먼트만 매칭
    "/actuator/health",
    "/error"
).permitAll()
```

### 패턴 차이 설명
| 패턴 | 의미 | 예시 매칭 |
|------|------|-----------|
| `*` | 단일 경로 세그먼트 | `/api/users/internal/...` |
| `**` | 여러 경로 세그먼트 (끝에만 사용) | `/api/auth/**` → `/api/auth/login`, `/api/auth/register/verify` |

---

## 문제 2: CORS 정책 차단 (Destination API 호출 시)

### 오류 메시지
```
Access to fetch at 'http://localhost:8080/api/destinations' from origin 'null'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is
present on the requested resource.
```

### 오류 판별법
- 메시지에 **"CORS policy"**, **"Access-Control-Allow-Origin"** 키워드가 있음
- 브라우저 개발자 도구 Network 탭에서 요청이 빨간색으로 표시됨
- 서버 로그에는 요청 자체가 기록되지 않을 수 있음

### 원인
로컬 HTML 파일(`file://` 프로토콜)에서 API를 호출할 때, 브라우저는 origin을 `null`로 전송함. 서버의 CORS 설정이 특정 origin만 허용하도록 되어 있어 `null` origin이 차단됨.

### 해결책
개발 환경에서 모든 origin을 허용하도록 CORS 설정 변경

### 구체적인 해결 방법
**파일:** `core-service/src/main/java/com/onetake/core/config/SecurityConfig.java`

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();

    // 수정 전: 특정 origin만 허용
    // configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:8080"));

    // 수정 후: 모든 origin 패턴 허용 (file:// 포함)
    configuration.setAllowedOriginPatterns(List.of("*"));

    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

### 주의사항
- `setAllowedOriginPatterns("*")`는 개발 환경에서만 사용
- 프로덕션 환경에서는 구체적인 도메인을 명시해야 함

---

## 문제 3: 인증 없이 Destination API 호출

### 오류 메시지
```json
{
    "timestamp": "2026-01-27T...",
    "status": 401,
    "error": "Unauthorized",
    "path": "/api/destinations"
}
```

### 오류 판별법
- HTTP 상태 코드 **401 Unauthorized**
- 응답 body에 **"Unauthorized"** 메시지

### 원인
Destination API는 인증이 필요한 엔드포인트. JWT 토큰 없이 요청하면 Spring Security가 차단함.

### 해결책
1. 먼저 로그인 API를 호출하여 JWT 토큰 획득
2. 이후 모든 API 요청의 Authorization 헤더에 토큰 포함

### 구체적인 해결 방법 (JavaScript)
```javascript
// 1. 로그인하여 토큰 획득
const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'user1', password: 'password123' })
});
const { accessToken } = await loginResponse.json();

// 2. 토큰을 저장
localStorage.setItem('accessToken', accessToken);

// 3. Destination API 호출 시 토큰 포함
const destResponse = await fetch('http://localhost:8080/api/destinations', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
});
```

---

## 문제 4: Destination 생성 시 필수 필드 누락

### 오류 메시지
```json
{
    "status": 400,
    "error": "Bad Request",
    "errors": {
        "platform": "플랫폼은 필수입니다",
        "streamUrl": "스트림 URL은 필수입니다",
        "streamKey": "스트림 키는 필수입니다"
    }
}
```

### 오류 판별법
- HTTP 상태 코드 **400 Bad Request**
- 응답에 **필드별 유효성 검사 오류 메시지** 포함

### 원인
Destination 생성 API는 필수 필드를 요구함:
- `platform`: 스트리밍 플랫폼 (YOUTUBE, TWITCH, CUSTOM 등)
- `streamUrl`: RTMP 서버 URL
- `streamKey`: 스트림 키
- `title`: 채널/방송 제목

### 해결책
요청 body에 모든 필수 필드 포함

### 구체적인 해결 방법
```javascript
const body = {
    platform: 'YOUTUBE',                              // 필수
    streamUrl: 'rtmp://a.rtmp.youtube.com/live2',    // 필수
    streamKey: 'xxxx-xxxx-xxxx-xxxx',                // 필수
    title: '내 라이브 방송',                          // 필수
    description: '방송 설명'                          // 선택
};

await fetch('http://localhost:8080/api/destinations', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
});
```

---

## 오류 판별 요약

| 오류 키워드 | HTTP 상태 | 의미 | 확인할 곳 |
|-------------|-----------|------|-----------|
| `PatternParseException`, `** pattern` | 500 | URL 패턴 문법 오류 | SecurityConfig.java 패턴 |
| `CORS policy`, `Access-Control-Allow-Origin` | - (요청 차단) | 서버가 요청 출처를 차단 | CORS 설정 |
| `Unauthorized` | 401 | 인증 토큰 없음/만료 | Authorization 헤더 |
| 필드 유효성 메시지 | 400 | 필수 필드 누락/잘못된 값 | 요청 body 필드 |

---

## 수정 파일 요약

| 문제 | 원인 | 해결책 | 수정 파일 |
|------|------|--------|-----------|
| URL 패턴 오류 | `**`가 경로 중간에 위치 | `**` → `*` 변경 | `SecurityConfig.java` |
| CORS 차단 | `null` origin 미허용 | `setAllowedOriginPatterns("*")` | `SecurityConfig.java` |
| 401 Unauthorized | JWT 토큰 미포함 | Authorization 헤더에 토큰 추가 | 클라이언트 코드 |
| 400 Bad Request | 필수 필드 누락 | 모든 필수 필드 포함 | 클라이언트 코드 |

---

## 관련 API 엔드포인트

| 메서드 | 경로 | 설명 | 인증 필요 |
|--------|------|------|-----------|
| POST | `/api/destinations` | 새 destination 생성 | O |
| GET | `/api/destinations` | 내 destination 목록 조회 | O |
| GET | `/api/destinations/{id}` | 특정 destination 조회 | O |
| PUT | `/api/destinations/{id}` | destination 수정 | O |
| DELETE | `/api/destinations/{id}` | destination 삭제 | O |
| POST | `/api/destinations/batch` | 여러 destination 일괄 조회 | O |
