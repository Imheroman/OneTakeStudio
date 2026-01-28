# CORS 에러 해결 가이드

> 작성일: 2026-01-28

---

## 문제 상황

로컬 HTML 파일에서 API 테스트 시 다음 에러 발생:

```
Access to fetch at 'http://localhost:8080/actuator/health' from origin 'null'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is
present on the requested resource.
```

---

## 원인 (쉬운 설명)

**CORS(Cross-Origin Resource Sharing)**는 브라우저의 보안 정책입니다.

쉽게 말하면:
- 서버가 **"누구의 요청을 받아줄지"** 미리 정해둔 명단이 있음
- 로컬 HTML 파일에서 요청하면 origin이 `null`로 표시됨
- `null`은 명단에 없으므로 → **차단됨**

```
허용 명단: localhost:3000, localhost:8080
요청 origin: null (로컬 파일)
→ 명단에 없음 → 차단!
```

---

## 원인 (기술적 설명)

`SecurityConfig.java`의 CORS 설정:

```java
// 변경 전 - 특정 origin만 허용
configuration.setAllowedOrigins(List.of(
    "http://localhost:3000",
    "http://localhost:8080"
));
```

로컬 파일(`file://` 프로토콜)에서 요청 시 브라우저는 origin을 `null`로 설정합니다.
`null`은 허용 목록에 없으므로 CORS 정책에 의해 차단됩니다.

---

## 해결책

### 방법 1: 모든 Origin 허용 (개발 환경용)

`SecurityConfig.java` 수정:

```java
// 변경 후 - 모든 origin 허용 (패턴 사용)
configuration.setAllowedOriginPatterns(List.of("*"));
```

**주의:** 이 설정은 개발 환경에서만 사용하세요. 운영 환경에서는 특정 도메인만 허용해야 합니다.

### 방법 2: 로컬 서버에서 HTML 실행

로컬 파일 대신 웹 서버에서 HTML을 서빙:

```bash
# Python 사용
cd docs
python -m http.server 5500

# 또는 VS Code의 Live Server 확장 사용
```

그 후 `http://localhost:5500/api-test.html`로 접속

### 방법 3: 특정 Origin 추가

`null`을 직접 허용 목록에 추가:

```java
configuration.setAllowedOrigins(List.of(
    "http://localhost:3000",
    "http://localhost:8080",
    "null"  // 로컬 파일 허용
));
```

---

## 수정된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `core-service/src/main/java/com/onetake/core/config/SecurityConfig.java` | `setAllowedOrigins` → `setAllowedOriginPatterns("*")` |

---

## 적용 방법

1. 코드 수정 후 **core-service 재시작** 필요
2. IntelliJ에서 서비스 Stop → Run

---

## 요약

| 항목 | 내용 |
|------|------|
| **문제** | 로컬 HTML에서 API 요청 시 CORS 차단 |
| **원인** | 로컬 파일 origin(`null`)이 허용 목록에 없음 |
| **해결** | `setAllowedOriginPatterns("*")` 로 모든 origin 허용 |
| **주의** | 운영 환경에서는 특정 도메인만 허용할 것 |

---

## 참고: CORS 관련 에러 메시지 유형

| 에러 메시지 | 원인 |
|-------------|------|
| `No 'Access-Control-Allow-Origin' header` | Origin이 허용 목록에 없음 |
| `Method not allowed` | HTTP 메서드(GET/POST 등)가 허용되지 않음 |
| `Header not allowed` | 요청 헤더가 허용되지 않음 |
| `Credentials not supported` | `allowCredentials`와 `allowedOrigins("*")` 충돌 |

---

## 운영 환경 설정 예시

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();

    // 운영 환경: 특정 도메인만 허용
    configuration.setAllowedOrigins(List.of(
        "https://onetakestudio.com",
        "https://www.onetakestudio.com"
    ));

    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE"));
    configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```
