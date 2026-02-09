# Studio 생성 API 검증 보고서 (실제 백엔드 기준)

작성일: 2026-01-28  
대상: `POST /api/studios` (API Gateway 60000 경유 → Core Service)

---

## 1. 결론(요약)

- **백엔드에는 Studio 생성 API가 구현되어 있다.**
- **인증(JWT)이 필수**이며, `Authorization: Bearer <accessToken>` 없이 호출하면 성공할 수 없다.
- **503(Service Unavailable)**가 뜬다면, “API 자체 스펙 오류”라기보다 **API Gateway가 `core-service` 인스턴스를 찾지 못해 라우팅에 실패**했을 가능성이 가장 높다(Eureka/등록/기동순서 이슈).

---

## 2. 라우팅(게이트웨이) 근거

API Gateway는 60000 포트에서 동작하며, `/api/studios/**` 요청을 `lb://core-service`로 라우팅한다.

```1:23:api-gateway/src/main/resources/application.yml
server:
  port: 60000

spring:
  cloud:
    gateway:
      server:
        webflux:
          discovery:
            locator:
              enabled: true
              lower-case-service-id: true
          routes:
            - id: core-service
              uri: lb://core-service
              predicates:
                - Path=/api/auth/**, /api/users/**, /api/studios/**, /api/workspace/**, /api/notifications/**, /api/destinations/**, /api/dashboard
```

즉 프론트는 **항상** `http://localhost:60000`만 바라보는 것이 맞다.

---

## 3. 인증 요구사항(보안) 근거

Core Service는 `/api/auth/**`만 공개이며, 그 외는 인증 필요.

```31:55:core-service/src/main/java/com/onetake/core/config/SecurityConfig.java
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)  // Gateway에서 CORS 처리
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exception ->
                    exception.authenticationEntryPoint(jwtAuthenticationEntryPoint))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(
                            "/api/auth/**",
                            "/actuator/health",
                            "/error",
                            "/*.html",
                            "/static/**",
                            "/css/**",
                            "/js/**"
                    ).permitAll()
                    .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
}
```

따라서 **`POST /api/studios`는 Authorization 헤더가 필요**하다.

---

## 4. API 엔드포인트(컨트롤러) 근거

Studio 생성 엔드포인트는 다음과 같이 구현되어 있다.

```19:35:core-service/src/main/java/com/onetake/core/studio/controller/StudioController.java
@RestController
@RequestMapping("/api/studios")
public class StudioController {

    @PostMapping
    public ResponseEntity<ApiResponse<StudioDetailResponse>> createStudio(
            @CurrentUser CustomUserDetails userDetails,
            @Valid @RequestBody CreateStudioRequest request) {

        StudioDetailResponse studio = studioService.createStudio(userDetails.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("스튜디오 생성 성공", studio));
    }
}
```

핵심 포인트:
- `@CurrentUser`를 사용하므로 **JWT 인증된 사용자 컨텍스트가 필요**함
- 성공 시 **HTTP 201** + `ApiResponse.success(...)` 반환

---

## 5. 요청(Request) 스펙 근거

Create 요청 DTO는 다음 필드를 포함한다.

```15:48:core-service/src/main/java/com/onetake/core/studio/dto/CreateStudioRequest.java
public class CreateStudioRequest {
    private String name;
    private String title;
    private String description;
    private String template;
    private String transmissionType;
    private String storageLocation;
    private List<String> platforms;

    public String getEffectiveName() {
        if (name != null && !name.isBlank()) return name;
        if (title != null && !title.isBlank()) return title;
        return null;
    }
}
```

주의:
- DTO 자체에 `@NotBlank`가 없어도, 서비스 로직에서 `getEffectiveName()`이 null이면 실패할 수 있음  
  (즉 **name 또는 title은 사실상 필수로 보는 게 안전**)
- 프론트가 단순화해서 `name`, `template`만 보내는 접근은 DTO 상 **수용 가능**(나머지 null)

---

## 6. 응답(Response) 스펙 근거

### 6.1 공통 래퍼: ApiResponse<T>

```8:39:common/src/main/java/com/onetake/common/dto/ApiResponse.java
public class ApiResponse<T> {
    private final String resultCode;
    private final boolean success;
    private final String message;
    private final T data;
    private final String errorCode;

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>("SUCCESS", true, message, data, null);
    }
}
```

즉, 성공 시 최소 형태는:
- `resultCode: "SUCCESS"`
- `success: true`
- `message: "스튜디오 생성 성공"`
- `data: StudioDetailResponse`

### 6.2 StudioDetailResponse 필드

```16:58:core-service/src/main/java/com/onetake/core/studio/dto/StudioDetailResponse.java
public class StudioDetailResponse {
    private Long studioId;
    private String name;
    private String description;
    private String thumbnail;
    private String template;
    private String status;
    private String joinUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

---

## 7. “정상 동작” 판정 기준(실행 체크리스트)

### 7.1 사전조건
- Eureka(8761) 실행
- core-service(8080) 실행 및 Eureka에 **등록(UP)**
- api-gateway(60000) 실행 및 Eureka registry fetch 정상

### 7.2 호출 흐름(권장)
1) 로그인으로 accessToken 발급: `POST /api/auth/login`  
2) 토큰을 넣고 Studio 생성: `POST /api/studios`

### 7.3 curl 예시(로컬)

1) 로그인:

```bash
curl -i -X POST "http://localhost:60000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"<email>","password":"<password>"}'
```

2) 스튜디오 생성:

```bash
curl -i -X POST "http://localhost:60000/api/studios" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"name":"My Studio","template":"live"}'
```

정상이라면:
- HTTP 201
- body에 `resultCode: "SUCCESS"`, `success: true`, `data.studioId` 포함

---

## 8. 장애 코드별 원인 분류(특히 503)

### 8.1 401/403
- 토큰 없음/만료/검증 실패  
- 해결: 로그인 후 Authorization 헤더 확인

### 8.2 400
- 요청 DTO validation(길이 제한 등) 또는 서비스 로직상 필수값 누락 가능  
- 해결: `name/title` 비었는지, 길이 제한 확인

### 8.3 503 (Service Unavailable)
- 프론트→Gateway는 OK, **Gateway→core-service 라우팅 실패**
- 대표 원인:
  - core-service가 Eureka에 미등록(UP 아님)
  - 실행 순서 문제(Eureka보다 먼저 뜸)
  - 게이트웨이 registry fetch 실패
  - 서비스 ID 불일치(등록명과 `lb://core-service` 불일치)

### 8.4 500 (Internal Server Error) ⚠️ **현재 발생 중인 문제**

**가능한 원인 1: MySQL 데이터베이스 연결 실패** (해결됨)

#### 증상
```
CJCommunicationsException: Communications link failure
Connection refused: getsockopt
```

#### 원인 분석

1. **503 → 500으로 변경된 의미**
   - 503: Gateway가 core-service를 찾지 못함 (라우팅 실패)
   - 500: Gateway가 core-service를 찾았지만, **core-service 내부에서 에러 발생**

2. **MySQL 연결 실패 원인**
   - core-service는 `localhost:3306`의 MySQL에 연결 시도
   - Docker Compose로 MySQL 컨테이너가 실행되어야 함
   - **MySQL 컨테이너가 실행되지 않았거나, 포트가 막혔거나, 네트워크 문제**

3. **연결 설정 확인**
   ```8:12:core-service/src/main/resources/application.yml
   datasource:
     url: jdbc:mysql://localhost:3306/core_db?useSSL=false&serverTimezone=Asia/Seoul&characterEncoding=UTF-8&allowPublicKeyRetrieval=true
     username: core_user
     password: core_password
     driver-class-name: com.mysql.cj.jdbc.Driver
   ```

4. **Docker Compose MySQL 설정**
   ```24:44:docker-compose.yml
   mysql:
     image: mysql:8.0
     container_name: onetakestudio-mysql
     environment:
       MYSQL_ROOT_PASSWORD: root_password
       MYSQL_DATABASE: core_db
       MYSQL_USER: core_user
       MYSQL_PASSWORD: core_password
     ports:
       - "3306:3306"
   ```

#### 해결 방법

**1단계: MySQL 컨테이너 실행 확인**
```bash
# Docker Compose로 MySQL 실행
docker-compose up -d mysql

# 컨테이너 상태 확인
docker ps | grep mysql

# MySQL 로그 확인
docker logs onetakestudio-mysql
```

**2단계: MySQL 연결 테스트**
```bash
# MySQL에 직접 연결 테스트
mysql -h localhost -P 3306 -u core_user -pcore_password core_db

# 또는 Docker 컨테이너 내부에서
docker exec -it onetakestudio-mysql mysql -u core_user -pcore_password core_db
```

**3단계: core-service 재시작**
- MySQL이 정상 실행된 후 core-service 재시작
- IntelliJ에서 core-service 재실행

**4단계: Studio 생성 API 재시도**
- MySQL 연결이 정상이면 core-service가 정상 시작됨
- 이제 `POST /api/studios`가 정상 동작해야 함

#### 추가 확인 사항

- **포트 충돌**: 다른 프로세스가 3306 포트를 사용 중인지 확인
  ```bash
  # Windows
  netstat -ano | findstr :3306
  
  # Linux/Mac
  lsof -i :3306
  ```

- **방화벽**: Windows 방화벽이 3306 포트를 막고 있는지 확인

- **네트워크**: Docker 네트워크가 정상인지 확인
  ```bash
  docker network ls
  docker network inspect onetakestudio-network
  ```

#### 예상되는 에러 흐름

1. **core-service 시작 시**: MySQL 연결 실패로 애플리케이션 시작 실패 또는 Health Check 실패
2. **API 요청 시**: 
   - core-service가 시작은 됐지만 DB 연결 풀이 없음
   - Studio 생성 시 DB 저장 시도 → 연결 실패 → 500 에러

---

**가능한 원인 2: 백엔드 코드 레벨 문제** ⚠️ **현재 확인 필요**

#### 발견된 잠재적 문제점

**1. IllegalArgumentException 미처리 (가장 가능성 높음)**

```40:45:core-service/src/main/java/com/onetake/core/studio/service/StudioService.java
@Transactional
public StudioDetailResponse createStudio(String userId, CreateStudioRequest request) {
    String studioName = request.getEffectiveName();
    if (studioName == null || studioName.isBlank()) {
        throw new IllegalArgumentException("스튜디오 이름(name 또는 title)은 필수입니다.");
    }
```

**문제점:**
- `GlobalExceptionHandler`에서 `IllegalArgumentException`을 처리하지 않음
- `Exception.class` 핸들러로 전달되어 **500 에러로 변환됨**
- 원래는 **400 Bad Request**가 되어야 함

**확인 방법:**
- core-service 로그에서 `IllegalArgumentException` 메시지 확인
- 프론트엔드에서 `name`과 `title` 모두 null/빈 문자열로 보내는 경우 발생 가능

**2. StudioDetailResponse.from() 메서드 오버로드 문제**

```46:58:core-service/src/main/java/com/onetake/core/studio/dto/StudioDetailResponse.java
public static StudioDetailResponse from(Studio studio) {
    return StudioDetailResponse.builder()
            .studioId(studio.getId())
            .name(studio.getName())
            .description(studio.getDescription())
            .thumbnail(studio.getThumbnail())
            .template(studio.getTemplate())
            .status(studio.getStatus().name().toLowerCase())
            .joinUrl("https://studio.example.com/join/" + studio.getStudioId())
            .createdAt(studio.getCreatedAt())
            .updatedAt(studio.getUpdatedAt())
            .build();
}
```

**문제점:**
- `createStudio`에서 `StudioDetailResponse.from(saved)` 호출 시
- `members`와 `scenes`가 **null로 설정됨**
- 프론트엔드 스키마가 배열을 기대할 경우 문제 발생 가능

**확인 방법:**
- 프론트엔드 응답 스키마에서 `members`와 `scenes`가 optional인지 확인
- null이면 빈 배열 `[]`로 변환 필요

**3. UserNotFoundException 처리**

```34:38:core-service/src/main/java/com/onetake/core/studio/service/StudioService.java
private Long getInternalUserId(String externalUserId) {
    User user = userRepository.findByUserId(externalUserId)
            .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
    return user.getId();
}
```

**확인 사항:**
- `UserNotFoundException`은 `GlobalExceptionHandler`에서 **404로 처리됨** (정상)
- 하지만 JWT 토큰의 `userId`가 DB에 없으면 404가 발생할 수 있음
- 로그인 후 사용자 정보가 DB에 정상 저장되었는지 확인 필요

**4. Studio 엔티티 필수 필드 검증**

```50:55:core-service/src/main/java/com/onetake/core/studio/service/StudioService.java
Studio studio = Studio.builder()
        .ownerId(internalUserId)
        .name(studioName)
        .description(request.getDescription())
        .template(request.getTemplate())
        .build();
```

**확인 사항:**
- `Studio` 엔티티의 `@Column(nullable = false)` 필드들이 모두 설정되는지 확인
- `studioId`는 `@PrePersist`에서 자동 생성되므로 문제 없음
- `status`는 `@Builder.Default`로 `READY`가 설정되므로 문제 없음

**3. host_user_id 필드 누락 (해결 완료)** ✅

**에러 메시지:**
```
SQL Error: 1364, SQLState: HY000
Field 'host_user_id' doesn't have a default value
```

**문제점:**
- 데이터베이스 `studios` 테이블에 `host_user_id` 필드가 NOT NULL로 존재
- 하지만 `Studio` 엔티티에 해당 필드가 정의되지 않음
- INSERT 쿼리에서 `host_user_id` 값이 전달되지 않아 에러 발생

**해결:**
- `Studio` 엔티티에 `hostUserId` 필드 추가
- `StudioService.createStudio()`에서 `hostUserId`를 `ownerId`와 동일하게 설정
- 마이그레이션 파일에 `host_user_id` 필드 및 외래키 추가

```java
// Studio.java
@Column(name = "host_user_id", nullable = false)
private Long hostUserId;

// StudioService.java
Studio studio = Studio.builder()
        .ownerId(internalUserId)
        .hostUserId(internalUserId) // 추가
        .name(studioName)
        // ...
        .build();
```

**4. title 필드 누락 (해결 완료)** ✅

**에러 메시지:**
```
SQL Error: 1364, SQLState: HY000
Field 'title' doesn't have a default value
```

**문제점:**
- 데이터베이스 `studios` 테이블에 `title` 필드가 NOT NULL로 존재
- 하지만 `Studio` 엔티티에 해당 필드가 정의되지 않음
- INSERT 쿼리에서 `title` 값이 전달되지 않아 에러 발생

**해결:**
- `Studio` 엔티티에 `title` 필드 추가
- `StudioService.createStudio()`에서 `title`을 `name`과 동일하게 설정
- 마이그레이션 파일에 `title` 필드 추가

```java
// Studio.java
@Column(nullable = false, length = 100)
private String title;

// StudioService.java
Studio studio = Studio.builder()
        .ownerId(internalUserId)
        .hostUserId(internalUserId)
        .name(studioName)
        .title(studioName) // name과 동일하게 설정
        // ...
        .build();
```

#### 백엔드 로그 확인 포인트

**core-service 로그에서 다음을 확인:**

1. **IllegalArgumentException 메시지**
   ```
   스튜디오 이름(name 또는 title)은 필수입니다.
   ```

2. **UserNotFoundException 메시지**
   ```
   사용자를 찾을 수 없습니다.
   ```

3. **데이터베이스 제약 조건 위반**
   ```
   DataIntegrityViolationException
   ```

4. **NullPointerException**
   ```
   NullPointerException at StudioDetailResponse.from
   ```

#### 해결 완료 ✅

**1. GlobalExceptionHandler에 IllegalArgumentException 핸들러 추가** ✅
- `IllegalArgumentException`이 이제 **400 Bad Request**로 올바르게 반환됨
- 500 에러로 변환되지 않음

**2. StudioService.createStudio() 수정** ✅
- `StudioDetailResponse.from(saved, List.of(), List.of())` 호출로 변경
- `members`와 `scenes`가 빈 배열로 반환됨 (null 아님)

**3. 프론트엔드 에러 처리 개선** ✅
- 400, 500, 503 에러에 대한 명확한 메시지 표시
- 사용자에게 더 구체적인 안내 제공

**4. 프론트엔드 스키마 확인** ✅
- `members`와 `scenes`가 `nullable().optional()`로 설정되어 있어 null/빈 배열 모두 수용 가능

**5. Studio 엔티티에 host_user_id 필드 추가** ✅
- 데이터베이스에 `host_user_id` 필드가 NOT NULL로 존재하지만 엔티티에 누락되어 있었음
- `Studio` 엔티티에 `hostUserId` 필드 추가
- `StudioService.createStudio()`에서 `hostUserId`를 `ownerId`와 동일하게 설정
- 마이그레이션 파일(`V3__create_studio_tables.sql`)에 `host_user_id` 필드 및 외래키 추가

**에러 메시지:**
```
SQL Error: 1364, SQLState: HY000
Field 'host_user_id' doesn't have a default value
```

**해결:**
- `Studio` 엔티티에 `@Column(name = "host_user_id", nullable = false) private Long hostUserId;` 추가
- `Studio.builder().hostUserId(internalUserId)` 설정
- 마이그레이션 파일에 `host_user_id BIGINT NOT NULL` 및 외래키 추가

**6. Studio 엔티티에 title 필드 추가** ✅
- 데이터베이스에 `title` 필드가 NOT NULL로 존재하지만 엔티티에 누락되어 있었음
- `Studio` 엔티티에 `title` 필드 추가
- `StudioService.createStudio()`에서 `title`을 `name`과 동일하게 설정
- 마이그레이션 파일(`V3__create_studio_tables.sql`)에 `title` 필드 추가

**에러 메시지:**
```
SQL Error: 1364, SQLState: HY000
Field 'title' doesn't have a default value
```

**해결:**
- `Studio` 엔티티에 `@Column(nullable = false, length = 100) private String title;` 추가
- `Studio.builder().title(studioName)` 설정 (name과 동일한 값)
- 마이그레이션 파일에 `title VARCHAR(100) NOT NULL` 추가

---

## 9. 부록: “MSW를 껐을 때” 기대되는 현상

- MSW off 상태에서 네트워크 탭에 `http://localhost:60000/api/studios`가 보이는 것은 정상.
- 이 상태에서 503이면 프론트 코드보다는 **백엔드 디스커버리/라우팅 상태** 점검이 우선.
- **500이면 MySQL 등 인프라 상태 점검이 우선**.

