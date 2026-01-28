# Feign Client 통합 오류 해결 문서

## 개요

- **대상**: media-service ↔ core-service 간 통신
- **작성일**: 2025-01-26
- **관련 기능**: 방송 송출 시 Destination 정보 조회

---

## 오류 목록

| # | 오류 유형 | 심각도 | 상태 |
|---|----------|--------|------|
| 1 | 인증 문제 (401 Unauthorized) | 높음 | 해결 |
| 2 | Spring Cloud 버전 호환성 | 중간 | 확인 필요 |
| 3 | Feign 타임아웃 설정 누락 | 중간 | 해결 |
| 4 | Feign 에러 디코더 누락 | 낮음 | 해결 |

---

## 1. 인증 문제 (401 Unauthorized)

### 증상

```
feign.FeignException$Unauthorized: [401] during [POST] to
[http://localhost:8081/api/destinations/internal/batch]
```

### 원인

core-service의 SecurityConfig에서 모든 요청에 인증을 요구하고 있어서,
media-service에서 인증 토큰 없이 호출 시 401 에러 발생

```java
// SecurityConfig.java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**", ...).permitAll()
    .anyRequest().authenticated()  // ← 문제 발생 지점
)
```

### 해결

core-service의 SecurityConfig에 내부 API 경로 허용 추가:

```java
// SecurityConfig.java (수정 후)
.authorizeHttpRequests(auth -> auth
    .requestMatchers(
        "/api/auth/**",
        "/api/**/internal/**",  // ← 추가
        "/actuator/health",
        ...
    ).permitAll()
    .anyRequest().authenticated()
)
```

### 수정 파일

- `core-service/src/main/java/com/onetake/core/config/SecurityConfig.java`

---

## 2. Spring Cloud 버전 호환성

### 증상

```
java.lang.NoClassDefFoundError: org/springframework/cloud/...
또는
Bean creation exception: ... incompatible version
```

### 원인

Spring Boot와 Spring Cloud 버전 간 호환성 문제

### 호환성 매트릭스

| Spring Cloud | Spring Boot |
|--------------|-------------|
| 2024.0.x | 3.3.x, 3.4.x |
| 2023.0.x | 3.2.x |

### 현재 설정

```xml
<!-- pom.xml -->
<spring-boot.version>3.5.0</spring-boot.version>
<spring-cloud.version>2024.0.0</spring-cloud.version>
```

### 해결

버전 불일치 발생 시:

```xml
<!-- 옵션 1: Spring Cloud 버전 업그레이드 -->
<spring-cloud.version>2024.0.1</spring-cloud.version>

<!-- 옵션 2: Spring Boot 버전 다운그레이드 -->
<spring-boot.version>3.4.x</spring-boot.version>
```

---

## 3. Feign 타임아웃 설정 누락

### 증상

```
feign.RetryableException: Read timed out executing POST
http://localhost:8081/api/destinations/internal/batch
```

### 원인

Feign 기본 타임아웃 설정이 짧아서 네트워크 지연 시 타임아웃 발생

### 해결

application.yml에 타임아웃 설정 추가:

```yaml
# application.yml
feign:
  client:
    config:
      default:
        connectTimeout: 5000   # 연결 타임아웃 5초
        readTimeout: 10000     # 읽기 타임아웃 10초
        loggerLevel: BASIC     # 로그 레벨
```

### 수정 파일

- `media-service/src/main/resources/application.yml`

---

## 4. Feign 에러 디코더 누락

### 증상

core-service 오류 시 원인 파악이 어렵고, 적절한 예외 처리가 되지 않음

```
feign.FeignException: status 500 reading CoreServiceClient#getDestinationsByIds(List)
```

### 원인

Feign 기본 에러 디코더는 HTTP 상태 코드만 반환하고,
애플리케이션 레벨의 에러 처리가 없음

### 해결

커스텀 ErrorDecoder 구현:

```java
// FeignErrorDecoder.java
@Slf4j
public class FeignErrorDecoder implements ErrorDecoder {

    @Override
    public Exception decode(String methodKey, Response response) {
        log.error("Feign error: methodKey={}, status={}",
                methodKey, response.status());

        return switch (response.status()) {
            case 400 -> new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
            case 404 -> new BusinessException(ErrorCode.DESTINATION_NOT_FOUND);
            case 500, 502, 503 -> new BusinessException(ErrorCode.DESTINATION_FETCH_FAILED);
            default -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        };
    }
}
```

```java
// FeignConfig.java
@Configuration
public class FeignConfig {

    @Bean
    public ErrorDecoder errorDecoder() {
        return new FeignErrorDecoder();
    }
}
```

### 추가 파일

- `media-service/src/main/java/com/onetakestudio/mediaservice/global/client/FeignErrorDecoder.java`
- `media-service/src/main/java/com/onetakestudio/mediaservice/global/config/FeignConfig.java`

---

## 테스트 방법

### 1. core-service 실행

```bash
cd core-service
./mvnw spring-boot:run
```

### 2. media-service 실행

```bash
cd media-service
./mvnw spring-boot:run
```

### 3. API 테스트

```bash
# Destination 등록 (core-service)
curl -X POST http://localhost:8081/api/destinations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "platform": "youtube",
    "channelId": "UC123",
    "channelName": "My Channel",
    "rtmpUrl": "rtmp://a.rtmp.youtube.com/live2/",
    "streamKey": "xxxx-xxxx-xxxx"
  }'

# 송출 시작 (media-service)
curl -X POST http://localhost:8082/api/v1/media/publish \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{
    "studioId": 1,
    "destinationIds": [1, 2]
  }'
```

---

## 체크리스트

- [x] SecurityConfig에 internal API 허용 추가
- [x] Feign 타임아웃 설정 추가
- [x] Feign 에러 디코더 구현
- [ ] 실제 통합 테스트 수행
- [ ] 로그 모니터링 확인

---

## 참고 자료

- [Spring Cloud OpenFeign 공식 문서](https://docs.spring.io/spring-cloud-openfeign/docs/current/reference/html/)
- [Spring Cloud / Spring Boot 버전 호환성](https://spring.io/projects/spring-cloud)