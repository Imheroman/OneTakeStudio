# OneTakeStudio 프로젝트 구조 개선 요약

> 작성일: 2026-01-27

## 개요

OneTakeStudio 백엔드 프로젝트의 MSA 구조 개선 및 패키지 정리 작업을 완료했습니다.

---

## 1. 변경 사항 요약

### 1.1 패키지명 변경

| 서비스 | 변경 전 | 변경 후 |
|--------|---------|---------|
| media-service | `com.onetakestudio.mediaservice` | `com.onetake.media` |
| core-service | `com.onetake.core` | 유지 |
| common | `com.onetake.common` | 유지 |

**변경된 파일 수**: 52개 Java 파일 + 3개 테스트 파일

### 1.2 메시지 브로커 변경

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 메시지 브로커 | RabbitMQ | Redis Streams |
| 의존성 | `spring-boot-starter-amqp` | `spring-boot-starter-data-redis` |
| 설정 클래스 | `RabbitConfig.java` | `RedisStreamConfig.java` |

### 1.3 신규 모듈 추가

| 모듈 | 패키지 | 포트 | 설명 |
|------|--------|------|------|
| eureka-server | `com.onetake.eureka` | 8761 | 서비스 디스커버리 |
| api-gateway | `com.onetake.gateway` | 8080 | API 게이트웨이 |

---

## 2. 최종 프로젝트 구조

```
onetakestudio-backend/
├── common/                    # 공통 모듈 (com.onetake.common)
├── core-service/              # 코어 서비스 (com.onetake.core)
├── media-service/             # 미디어 서비스 (com.onetake.media)
├── eureka-server/             # Eureka 서버 (com.onetake.eureka) [신규]
├── api-gateway/               # API 게이트웨이 (com.onetake.gateway) [신규]
├── frontend/
├── docs/
├── docker-compose.yml
├── livekit.yaml
└── pom.xml
```

---

## 3. 포트 할당

| 서비스 | 포트 | 비고 |
|--------|------|------|
| API Gateway | 8080 | 외부 진입점 |
| Core Service | 8081 | 인증/사용자 관리 |
| Media Service | 8082 | 스트리밍/녹화/송출 |
| Eureka Server | 8761 | 서비스 레지스트리 |
| MySQL | 3306 | Core Service DB |
| PostgreSQL | 5432 | Media Service DB |
| Redis | 6379 | 캐시 + Streams |
| LiveKit | 7880-7881 | WebRTC 서버 |

---

## 4. 상세 변경 내역

### 4.1 삭제된 파일

| 파일 | 설명 |
|------|------|
| `nul` | 불필요한 파일 |
| `media-service/.../RabbitConfig.java` | RabbitMQ 설정 |
| `media-service/src/main/java/com/onetakestudio/` | 이전 패키지 디렉토리 전체 |
| `media-service/src/test/java/com/onetakestudio/` | 이전 테스트 디렉토리 전체 |

### 4.2 신규 생성 파일

#### Eureka Server
```
eureka-server/
├── pom.xml
└── src/main/
    ├── java/com/onetake/eureka/
    │   └── EurekaServerApplication.java
    └── resources/
        └── application.yml
```

#### API Gateway
```
api-gateway/
├── pom.xml
└── src/main/
    ├── java/com/onetake/gateway/
    │   └── ApiGatewayApplication.java
    └── resources/
        └── application.yml
```

#### Redis Streams 설정
```
media-service/src/main/java/com/onetake/media/global/config/
└── RedisStreamConfig.java
```

### 4.3 수정된 설정 파일

#### parent pom.xml
- `eureka-server`, `api-gateway` 모듈 추가
- Spring Cloud 의존성 관리 추가

#### media-service/pom.xml
- `spring-boot-starter-amqp` 제거
- `spring-cloud-starter-netflix-eureka-client` 추가
- `spring-retry`, `spring-aspects` 추가

#### media-service/application.yml
```yaml
# 추가된 설정
server:
  port: 8082

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
    register-with-eureka: true
    fetch-registry: true
  instance:
    prefer-ip-address: true

# 제거된 설정
# spring.rabbitmq.* 관련 설정 전체
```

#### core-service/pom.xml
- `spring-cloud-starter-netflix-eureka-client` 추가
- `spring-boot-starter-actuator` 추가

#### core-service/application.yml
```yaml
# 추가된 설정
server:
  port: 8081

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
    register-with-eureka: true
    fetch-registry: true
  instance:
    prefer-ip-address: true
```

#### docker-compose.yml
- RabbitMQ 서비스 제거
- `rabbitmq_data` 볼륨 제거

---

## 5. API Gateway 라우팅 규칙

```yaml
routes:
  - id: core-service
    uri: lb://core-service
    predicates:
      - Path=/api/auth/**, /api/users/**, /api/studios/**

  - id: media-service
    uri: lb://media-service
    predicates:
      - Path=/api/v1/media/**
```

---

## 6. Redis Streams 사용법

### 이벤트 발행 예시
```java
// RecordingService.java
private void publishRecordingStoppedEvent(RecordingStoppedEvent event) {
    Map<String, String> message = new HashMap<>();
    message.put("type", "RECORDING_STOPPED");
    message.put("recordingId", event.getRecordingId().toString());
    message.put("studioId", event.getStudioId().toString());
    message.put("s3Url", event.getS3Url());
    message.put("duration", String.valueOf(event.getDuration()));
    message.put("fileSize", String.valueOf(event.getFileSize()));
    message.put("timestamp", Instant.now().toString());

    redisTemplate.opsForStream().add(RedisStreamConfig.STREAM_KEY, message);
}
```

### Stream 설정
```java
// RedisStreamConfig.java
public static final String STREAM_KEY = "media-events";
public static final String CONSUMER_GROUP = "media-service-group";
```

---

## 7. 서비스 실행 순서

1. **인프라 서비스** (docker-compose)
   ```bash
   docker-compose up -d
   ```

2. **Eureka Server**
   ```bash
   cd eureka-server && mvn spring-boot:run
   ```

3. **Core Service / Media Service** (순서 무관)
   ```bash
   cd core-service && mvn spring-boot:run
   cd media-service && mvn spring-boot:run
   ```

4. **API Gateway**
   ```bash
   cd api-gateway && mvn spring-boot:run
   ```

---

## 8. 검증 방법

### 빌드 확인
```bash
mvn clean install -DskipTests
```

### Eureka 대시보드
- URL: http://localhost:8761
- 등록된 서비스: CORE-SERVICE, MEDIA-SERVICE, API-GATEWAY

### API 호출 테스트
```bash
# Gateway를 통한 Core Service 호출
curl http://localhost:8080/api/auth/health

# Gateway를 통한 Media Service 호출
curl http://localhost:8080/api/v1/media/health
```

---

## 9. 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | Spring Boot 3.5.9 |
| Java | 21 |
| Spring Cloud | 2025.0.0 |
| Service Discovery | Netflix Eureka |
| API Gateway | Spring Cloud Gateway |
| Message Broker | Redis Streams |
| Database (Core) | MySQL 8.0 |
| Database (Media) | PostgreSQL 16 |
| Cache | Redis 7 |
| WebRTC | LiveKit |

---

## 10. 주의 사항

1. **서비스 시작 순서**: Eureka Server가 먼저 실행되어야 다른 서비스들이 등록 가능
2. **포트 충돌**: 기존에 8080, 8081, 8082, 8761 포트를 사용하는 서비스가 있는지 확인
3. **Redis 필수**: Media Service의 이벤트 발행/구독에 Redis가 필수
4. **Gateway 경유**: 프로덕션 환경에서는 모든 API 호출이 Gateway(8080)를 통해야 함
