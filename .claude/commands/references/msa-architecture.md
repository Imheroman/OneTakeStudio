# OneTakeStudio MSA 아키텍처 설계

## 목차
1. [MSA 개요](#msa-개요)
2. [서비스 분리 전략](#서비스-분리-전략)
3. [서비스 간 통신](#서비스-간-통신)
4. [데이터 관리](#데이터-관리)
5. [트랜잭션 처리](#트랜잭션-처리)
6. [장애 격리 및 복원력](#장애-격리-및-복원력)
7. [보안](#보안)

---

## MSA 개요

OneTakeStudio는 **2개의 핵심 서비스**로 구성된 MSA 아키텍처를 채택합니다:

1. **Core Service** (코어 서비스) - MySQL
2. **Media Service** (미디어 서비스) - PostgreSQL

이와 함께 **AI Service** (Python/FastAPI)가 독립적으로 운영됩니다.

### 왜 2개의 서비스인가?

**도메인 응집도**:
- **Core Service**: 비즈니스 로직 중심 (사용자, 인증, 스튜디오 메타데이터)
- **Media Service**: 대용량 미디어 처리 중심 (스트리밍, 녹화, 채팅, 파일)

**데이터베이스 특성**:
- **MySQL**: 트랜잭션 일관성이 중요한 비즈니스 데이터
- **PostgreSQL**: 대용량 미디어 메타데이터, 채팅 로그, 분석 데이터

**확장성**:
- 미디어 서비스는 트래픽이 많아 독립적인 스케일링 필요
- 코어 서비스는 상대적으로 안정적인 트래픽

---

## 서비스 분리 전략

### Core Service (코어 서비스)

**책임**:
- 사용자 계정 관리
- 인증 및 권한
- 스튜디오 메타데이터 (생성, 수정, 삭제)
- 워크스페이스 설정
- 파트너 즐겨찾기
- 송출 채널 연동 정보

**포트**: 8080

**데이터베이스**: MySQL

**주요 엔티티**:
```
- User (사용자)
- Studio (스튜디오)
- StudioMember (멤버)
- Destination (송출 채널)
- Favorite (즐겨찾기)
- Settings (설정)
```

**API 예시**:
```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/users/me
POST   /api/studios
GET    /api/studios/{id}
POST   /api/studios/{id}/members/invite
```

---

### Media Service (미디어 서비스)

**책임**:
- WebRTC 세션 관리
- RTMP 스트리밍
- 녹화본 저장 및 관리
- 실시간 채팅 (멀티 플랫폼)
- 파일 업로드/다운로드
- 스토리지 용량 관리
- 타임라인 및 마커

**포트**: 8081

**데이터베이스**: PostgreSQL

**주요 엔티티**:
```
- Recording (녹화본)
- ChatMessage (채팅 메시지)
- Marker (북마크/마커)
- StorageUsage (스토리지 사용량)
- Asset (브랜드 에셋)
- Clip (쇼츠 클립)
```

**API 예시**:
```
POST   /api/media/streaming/start
POST   /api/media/streaming/stop
POST   /api/media/recordings
GET    /api/media/recordings/{id}
POST   /api/media/chat/send
GET    /api/media/chat/history
POST   /api/media/storage/upload
```

---

### AI Service (AI 서비스)

**책임**:
- AI 쇼츠 자동 생성
- 채팅 감정 분석
- STT (Speech-to-Text)
- 다국어 자막 생성
- 영상 하이라이트 추출

**포트**: 8000

**Framework**: FastAPI (Python)

**API 예시**:
```
POST   /api/ai/shorts/generate
POST   /api/ai/subtitles/translate
POST   /api/ai/analysis/highlights
GET    /api/ai/jobs/{id}/status
```

---

## 서비스 간 통신

### 1. 동기 통신 (REST API)

**사용 케이스**: 즉각적인 응답이 필요한 경우

**예시**:
```
Frontend → Gateway → Core Service (사용자 정보 조회)
```

**Spring Cloud OpenFeign 사용**:

```java
// Core Service에서 Media Service 호출
@FeignClient(name = "media-service")
public interface MediaServiceClient {
    
    @GetMapping("/api/recordings/{recordingId}")
    RecordingDto getRecording(@PathVariable Long recordingId);
}
```

**Circuit Breaker (Resilience4j)**:
```java
@CircuitBreaker(name = "mediaService", fallbackMethod = "getRecordingFallback")
public RecordingDto getRecordingWithCircuitBreaker(Long recordingId) {
    return mediaServiceClient.getRecording(recordingId);
}

public RecordingDto getRecordingFallback(Long recordingId, Exception e) {
    return RecordingDto.builder()
            .id(recordingId)
            .status("UNAVAILABLE")
            .build();
}
```

---

### 2. 비동기 통신 (RabbitMQ)

**사용 케이스**: 느슨한 결합, 이벤트 기반 처리

**주요 이벤트**:

| 이벤트 | Publisher | Subscriber | 설명 |
|--------|-----------|------------|------|
| `studio.created` | Core Service | Media Service | 스튜디오 생성 시 WebRTC 세션 초기화 |
| `recording.started` | Media Service | Core Service | 녹화 시작 시 상태 업데이트 |
| `recording.completed` | Media Service | AI Service | 녹화 완료 시 AI 쇼츠 생성 시작 |
| `shorts.generated` | AI Service | Core Service | 쇼츠 생성 완료 시 알림 발송 |
| `chat.message` | Media Service | All | 실시간 채팅 브로드캐스트 |
| `member.invited` | Core Service | Media Service | 멤버 초대 시 백스테이지 권한 설정 |

**Exchange 설계**:

```
studio.exchange (Topic Exchange)
 ├─ studio.created
 ├─ studio.updated
 └─ studio.deleted

recording.exchange (Topic Exchange)
 ├─ recording.started
 ├─ recording.completed
 └─ recording.deleted

ai.exchange (Topic Exchange)
 ├─ shorts.requested
 ├─ shorts.generated
 └─ subtitles.generated

notification.exchange (Fanout Exchange)
 └─ (모든 서비스가 구독)
```

**이벤트 발행 예시**:

```java
// Core Service - StudioService.java
@Service
public class StudioService {
    
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    @Transactional
    public StudioDto createStudio(CreateStudioRequest request, Long userId) {
        Studio studio = studioRepository.save(/* ... */);
        
        // 이벤트 발행
        StudioCreatedEvent event = StudioCreatedEvent.builder()
                .studioId(studio.getId())
                .userId(userId)
                .type(studio.getType())
                .platforms(request.getPlatforms())
                .timestamp(Instant.now())
                .build();
        
        rabbitTemplate.convertAndSend(
            "studio.exchange",
            "studio.created",
            event
        );
        
        return StudioDto.from(studio);
    }
}
```

**이벤트 구독 예시**:

```java
// Media Service - StudioEventListener.java
@Component
public class StudioEventListener {
    
    @Autowired
    private WebRTCSessionService webRTCSessionService;
    
    @RabbitListener(queues = "media.studio.queue")
    public void handleStudioCreated(StudioCreatedEvent event) {
        log.info("Received studio.created event: {}", event.getStudioId());
        
        // WebRTC 세션 초기화
        webRTCSessionService.initializeSession(event.getStudioId());
        
        // RTMP 엔드포인트 설정
        if (event.getType() == StudioType.LIVE) {
            rtmpService.setupEndpoint(event.getStudioId(), event.getPlatforms());
        }
    }
}
```

---

## 데이터 관리

### 1. Database per Service 패턴

각 서비스는 **자신의 데이터베이스**를 소유합니다:

- **Core Service** → MySQL
- **Media Service** → PostgreSQL

**장점**:
- 서비스 간 독립성
- 기술 스택 자유도
- 스케일링 용이

**단점**:
- 분산 트랜잭션 복잡도
- 데이터 일관성 관리

---

### 2. 데이터 중복 최소화 전략

**원칙**: 각 서비스는 **자신이 소유한 데이터의 단일 진실 공급원(Single Source of Truth)**입니다.

**예시**:
```
Core Service:
  - User (userId, email, nickname, profileImage)
  - Studio (studioId, title, ownerId, type)

Media Service:
  - Recording (recordingId, studioId, title, duration)
  - (studioId를 FK로 참조하지만 Studio 상세 정보는 저장하지 않음)
```

**필요 시 동기화**:
```java
// Media Service에서 스튜디오 정보가 필요할 때
@Service
public class RecordingService {
    
    @Autowired
    private CoreServiceClient coreServiceClient; // Feign Client
    
    public RecordingDetailDto getRecordingDetail(Long recordingId) {
        Recording recording = recordingRepository.findById(recordingId)
                .orElseThrow();
        
        // Core Service에서 스튜디오 정보 조회
        StudioDto studio = coreServiceClient.getStudio(recording.getStudioId());
        
        return RecordingDetailDto.builder()
                .recording(recording)
                .studioTitle(studio.getTitle())
                .ownerName(studio.getOwnerName())
                .build();
    }
}
```

---

### 3. 캐싱 전략 (Redis)

**공통 캐시 데이터**:
- 사용자 프로필 (TTL: 1시간)
- 스튜디오 메타데이터 (TTL: 30분)
- JWT 블랙리스트 (TTL: 토큰 만료 시간)
- 송출 채널 정보 (TTL: 1시간)

**캐시 무효화**:
```java
@Service
public class UserService {
    
    @Autowired
    private RedisTemplate<String, User> redisTemplate;
    
    @CachePut(value = "users", key = "#userId")
    public User updateUser(Long userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId).orElseThrow();
        // 업데이트 로직
        user = userRepository.save(user);
        
        // RabbitMQ 이벤트 발행 → 다른 서비스도 캐시 무효화
        rabbitTemplate.convertAndSend("user.exchange", "user.updated", 
            new UserUpdatedEvent(userId));
        
        return user;
    }
}
```

---

## 트랜잭션 처리

### 1. Saga 패턴

**시나리오**: 스튜디오 생성 + WebRTC 세션 초기화

**Choreography Saga** (이벤트 기반):

```
1. [Core Service] Studio 생성 → DB에 저장
2. [Core Service] studio.created 이벤트 발행
3. [Media Service] 이벤트 수신 → WebRTC 세션 초기화
4. [Media Service] 성공 시 session.initialized 이벤트 발행
5. [Core Service] Studio 상태를 'READY'로 업데이트
```

**보상 트랜잭션 (Compensating Transaction)**:

```java
// Media Service에서 WebRTC 세션 초기화 실패 시
@Service
public class WebRTCSessionService {
    
    public void initializeSession(Long studioId) {
        try {
            // WebRTC 세션 초기화 로직
            sessionRepository.save(/* ... */);
            
            // 성공 이벤트 발행
            rabbitTemplate.convertAndSend("session.exchange", "session.initialized",
                new SessionInitializedEvent(studioId));
                
        } catch (Exception e) {
            log.error("Failed to initialize WebRTC session for studio: {}", studioId, e);
            
            // 실패 이벤트 발행 → Core Service가 Studio 삭제
            rabbitTemplate.convertAndSend("session.exchange", "session.failed",
                new SessionFailedEvent(studioId, e.getMessage()));
        }
    }
}

// Core Service - SessionEventListener.java
@Component
public class SessionEventListener {
    
    @RabbitListener(queues = "core.session.queue")
    public void handleSessionFailed(SessionFailedEvent event) {
        log.warn("WebRTC session failed for studio: {}", event.getStudioId());
        
        // 보상 트랜잭션: Studio 삭제
        studioRepository.deleteById(event.getStudioId());
        
        // 사용자에게 실패 알림
        notificationService.sendFailureNotification(event.getStudioId());
    }
}
```

---

### 2. 멱등성 (Idempotency)

**문제**: RabbitMQ 메시지가 중복 수신될 수 있음

**해결**: 멱등성 키(Idempotency Key) 사용

```java
@Component
public class IdempotentEventListener {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    @RabbitListener(queues = "media.studio.queue")
    public void handleStudioCreated(StudioCreatedEvent event) {
        String idempotencyKey = "studio:created:" + event.getStudioId();
        
        // Redis에서 중복 체크
        Boolean isNew = redisTemplate.opsForValue()
                .setIfAbsent(idempotencyKey, "processed", 1, TimeUnit.HOURS);
        
        if (Boolean.TRUE.equals(isNew)) {
            // 처음 받은 이벤트 → 처리
            webRTCSessionService.initializeSession(event.getStudioId());
        } else {
            // 중복 이벤트 → 무시
            log.info("Duplicate event ignored: {}", idempotencyKey);
        }
    }
}
```

---

## 장애 격리 및 복원력

### 1. Circuit Breaker (Resilience4j)

**설정**:
```yaml
# application.yml
resilience4j.circuitbreaker:
  instances:
    mediaService:
      registerHealthIndicator: true
      slidingWindowSize: 10
      minimumNumberOfCalls: 5
      permittedNumberOfCallsInHalfOpenState: 3
      automaticTransitionFromOpenToHalfOpenEnabled: true
      waitDurationInOpenState: 10s
      failureRateThreshold: 50
      recordExceptions:
        - org.springframework.web.client.HttpServerErrorException
```

**사용**:
```java
@Service
public class StudioService {
    
    @CircuitBreaker(name = "mediaService", fallbackMethod = "getRecordingsFallback")
    public List<RecordingDto> getStudioRecordings(Long studioId) {
        return mediaServiceClient.getRecordingsByStudio(studioId);
    }
    
    // Fallback 메서드
    public List<RecordingDto> getRecordingsFallback(Long studioId, Exception e) {
        log.warn("Media Service unavailable, returning cached data", e);
        return cacheService.getCachedRecordings(studioId);
    }
}
```

---

### 2. Retry (재시도)

```java
@Retryable(
    value = {RestClientException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 1000, multiplier = 2)
)
public RecordingDto getRecording(Long recordingId) {
    return mediaServiceClient.getRecording(recordingId);
}
```

---

### 3. Rate Limiting (요청 제한)

```java
@RateLimiter(name = "default")
@GetMapping("/api/studios")
public List<StudioDto> getMyStudios() {
    return studioService.getMyStudios();
}
```

---

## 보안

### 1. JWT 인증 흐름

```
1. [Client] → [Gateway] POST /api/auth/login
2. [Gateway] → [Core Service] 인증 요청
3. [Core Service] JWT Access Token + Refresh Token 발급
4. [Client] 이후 요청 시 Header에 "Authorization: Bearer {token}"
5. [Gateway] JWT 검증 후 라우팅
```

**JWT 구조**:
```json
{
  "sub": "123",              // User ID
  "email": "user@example.com",
  "role": "USER",
  "iat": 1609459200,
  "exp": 1609462800          // 1시간 후 만료
}
```

**Gateway에서 JWT 검증**:
```java
@Component
public class JwtAuthenticationFilter implements GlobalFilter {
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String token = extractToken(exchange.getRequest());
        
        if (token != null && jwtUtil.validateToken(token)) {
            // 사용자 정보를 헤더에 추가
            ServerHttpRequest request = exchange.getRequest().mutate()
                    .header("X-User-Id", jwtUtil.getUserId(token))
                    .header("X-User-Role", jwtUtil.getUserRole(token))
                    .build();
            
            return chain.filter(exchange.mutate().request(request).build());
        }
        
        // 인증 실패
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }
}
```

---

### 2. Service-to-Service 인증

**Internal JWT** (서비스 간 통신용):
```java
@Service
public class InternalAuthService {
    
    public String generateInternalToken() {
        return JWT.create()
                .withIssuer("core-service")
                .withClaim("service", "media-service")
                .withExpiresAt(new Date(System.currentTimeMillis() + 3600000))
                .sign(Algorithm.HMAC256(internalSecret));
    }
}

// Feign Client에 Interceptor 추가
@Configuration
public class FeignConfig {
    
    @Bean
    public RequestInterceptor requestInterceptor(InternalAuthService authService) {
        return template -> {
            String token = authService.generateInternalToken();
            template.header("Authorization", "Bearer " + token);
        };
    }
}
```

---

### 3. CORS 설정

```yaml
# Gateway - application.yml
spring:
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins:
              - "http://localhost:3000"
              - "https://onetake.studio"
            allowedMethods:
              - GET
              - POST
              - PUT
              - DELETE
              - OPTIONS
            allowedHeaders:
              - "*"
            allowCredentials: true
```

---

## API Gateway 라우팅 전략

### Spring Cloud Gateway 설정

```yaml
# gateway-service/application.yml
spring:
  cloud:
    gateway:
      routes:
        # Core Service - Auth
        - id: auth-service
          uri: lb://CORE-SERVICE
          predicates:
            - Path=/api/auth/**
          filters:
            - RewritePath=/api/auth/(?<segment>.*), /auth/$\{segment}

        # Core Service - Users
        - id: user-service
          uri: lb://CORE-SERVICE
          predicates:
            - Path=/api/users/**
          filters:
            - RewritePath=/api/users/(?<segment>.*), /users/$\{segment}
            - name: AuthenticationFilter

        # Core Service - Studios
        - id: studio-service
          uri: lb://CORE-SERVICE
          predicates:
            - Path=/api/studios/**
          filters:
            - RewritePath=/api/studios/(?<segment>.*), /studios/$\{segment}
            - name: AuthenticationFilter

        # Media Service - Streaming
        - id: streaming-service
          uri: lb://MEDIA-SERVICE
          predicates:
            - Path=/api/media/streaming/**
          filters:
            - RewritePath=/api/media/streaming/(?<segment>.*), /streaming/$\{segment}
            - name: AuthenticationFilter

        # Media Service - Recordings
        - id: recording-service
          uri: lb://MEDIA-SERVICE
          predicates:
            - Path=/api/media/recordings/**
          filters:
            - RewritePath=/api/media/recordings/(?<segment>.*), /recordings/$\{segment}
            - name: AuthenticationFilter

        # AI Service
        - id: ai-service
          uri: http://ai-service:8000
          predicates:
            - Path=/api/ai/**
          filters:
            - RewritePath=/api/ai/(?<segment>.*), /ai/$\{segment}
            - name: AuthenticationFilter
```

---

**이 문서는 OneTakeStudio MSA 아키텍처의 핵심 설계 원칙과 구현 패턴을 다룹니다.**
