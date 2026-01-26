---
name: onetake-streaming-project
description: OneTakeStudio MSA 개발 프로젝트 통합 가이드. Spring Boot 3.5.9, Java 21, React, Next.js, LiveKit WebRTC 기반. 아이디/비밀번호/닉네임 간편 회원가입. MSA 2-서비스 구조 (Core-MySQL, Media-PostgreSQL). 라이브 스트리밍, WebRTC, 녹화, AI 쇼츠, 멀티 플랫폼 송출, 실시간 채팅. 내부 BIGINT + 외부 UUID 설계. LiveKit Egress 연동. Spring Cloud Gateway, Eureka, RabbitMQ, Redis, k3s 환경. 6인 팀 개발.
---

# OneTakeStudio MSA 개발 프로젝트 (최종 통합 가이드)

## 📌 프로젝트 개요

**OneTakeStudio**는 "송출부터 편집까지 원테이크"를 실현하는 **웹 기반 멀티 플랫폼 라이브 스트리밍 플랫폼**입니다.

### 🎯 핵심 기능
1. **WebRTC 기반 라이브 스트리밍** (LiveKit)
2. **멀티 플랫폼 동시 송출** (YouTube, Twitch, 치지직)
3. **실시간 녹화 및 마커 시스템**
4. **AI 기반 쇼츠 자동 생성**
5. **통합 채팅 시스템**
6. **실시간 협업** (백스테이지/팬텀 모드)
7. **클라우드 스토리지 관리**

---

## 👥 팀 구성

- **백엔드**: 2명 (Spring Boot, MSA)
- **프론트엔드**: 2명 (React, Next.js, WebRTC)
- **인프라**: 1명 (k3s, Jenkins, Docker)
- **AI**: 1명 (Python, FastAPI, OpenCV)

**총 6인 팀 개발 프로젝트**

---

## 🏗️ 기술 스택

### Frontend
- React, Next.js, JavaScript, HTML5, CSS
- WebRTC (LiveKit SDK)
- Socket.io-client, Zustand/Redux
- TailwindCSS, Shadcn/ui

### Backend (MSA)
- **Framework**: Spring Boot **3.5.9**
- **Language**: Java **21** (Oracle JDK)
- **ORM**: Spring Data JPA
- **MSA**:
  - Spring Cloud Gateway (API Gateway)
  - Spring Cloud Netflix Eureka (Service Discovery)
  - Spring Cloud Config (중앙 설정)
  - RabbitMQ (Message Queue)
- **WebRTC**: **LiveKit** (SFU Server)
- **Database**:
  - Core Service: **MySQL 8.0**
  - Media Service: **PostgreSQL 15**
- **Cache**: Redis 7
- **Auth**: JWT, Spring Security

### AI Service
- FastAPI, Python
- OpenCV, TensorFlow/PyTorch
- Whisper (STT)

### Infrastructure
- **Orchestration**: **k3s** (Lightweight Kubernetes)
- **CI/CD**: Jenkins
- **Container**: Docker
- **Storage**: MinIO (S3-compatible)
- **Reverse Proxy**: Nginx (+ RTMP)
- **Monitoring**: Prometheus, Grafana

---

## 📂 MSA 아키텍처

### 서비스 구성

```
┌─────────────────────────────────────────────────────────────┐
│                   Spring Cloud Gateway                       │
│                    (API Gateway / Port: 8000)                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─── Service Discovery
                            │    (Eureka Server / Port: 8761)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Core Service    │ │  Media Service   │ │   AI Service     │
│  (Port: 8080)    │ │  (Port: 8081)    │ │  (Port: 8000)    │
│                  │ │                  │ │                  │
│  - Auth          │ │  - Stream        │ │  - AI Shorts     │
│  - User          │ │  - Recording     │ │  - STT/자막      │
│  - Studio        │ │  - Publish       │ │  - 영상 분석     │
│  - Destination   │ │  - ScreenShare   │ │                  │
│  - Workspace     │ │                  │ │  Python/FastAPI  │
│                  │ │  + LiveKit       │ │                  │
│  MySQL           │ │  PostgreSQL      │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────────────┐
                    │   RabbitMQ    │
                    │ (Message Bus) │
                    └───────────────┘
                            │
                    ┌───────────────┐
                    │   LiveKit     │
                    │ (WebRTC SFU)  │
                    └───────────────┘
```

---

## 🎯 설계 원칙

### 1. ID 전략: 내부 BIGINT + 외부 UUID

```sql
-- 모든 테이블 공통 패턴
CREATE TABLE example (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,  -- 내부 조인용 (성능)
    example_id CHAR(36) UNIQUE NOT NULL,   -- 외부 API 노출용 (보안)
    ...
);
```

**이유**:
- ✅ 내부 조인 성능 최적화 (BIGINT)
- ✅ API 보안 (UUID 예측 불가)
- ✅ MSA 분산 환경 적합

### 2. Destination 분리: Core + Media

```
Core Service:
  → connected_destinations (OAuth 토큰, 채널 메타데이터)
  
Media Service:
  → publish_destinations (실시간 RTMP 연결 상태)
```

**이유**:
- ✅ 단일 책임 원칙
- ✅ 장애 격리
- ✅ 확장성

### 3. egress_id 필수 저장

```sql
-- LiveKit 연동 시 필수!
recordings.egress_id VARCHAR(100)
publish_sessions.egress_id VARCHAR(100)
```

**이유**: LiveKit으로 녹화/송출 중지 요청 시 반드시 필요

---

## 🗄️ 데이터베이스 구조

### Core Service (MySQL - core_db)

| 테이블 | 설명 |
|--------|------|
| `users` | 사용자 (id + user_id) |
| `studios` | 스튜디오 (id + studio_id) |
| `studio_members` | 멤버 초대/역할 |
| `member_invites` | 초대장 |
| `scenes` | 씬/장면 |
| `scene_sources` | 소스 레이어 |
| `connected_destinations` | 연동된 송출 채널 (OAuth) ⭐ |
| `studio_destination_map` | 스튜디오-채널 매핑 |
| `refresh_tokens` | JWT Refresh Token |

### Media Service (PostgreSQL - media_db)

| 테이블 | 설명 |
|--------|------|
| `stream_sessions` | WebRTC 세션 (LiveKit Token) |
| `publish_sessions` | 송출 세션 (egress_id 포함) ⭐ |
| `publish_destinations` | 실시간 RTMP 상태 ⭐ |
| `publish_events` | 송출 이벤트 로그 |
| `recordings` | 녹화본 (egress_id 포함) |
| `recording_events` | 녹화 이벤트 로그 |
| `clips` | 클립/쇼츠 |
| `markers` | 마커/북마크 |
| `banners` | 배너 |

**상세 ERD**: `references/database-erd.md`

---

## 🔐 인증 시스템 (간편 회원가입)

### 필수 입력 정보
- **아이디** (username): 영문, 숫자, 언더스코어 (4-20자)
- **비밀번호** (password): 8자 이상
- **닉네임** (nickname): 2-20자

### 제외된 기능
- ❌ 이메일 입력 불필요
- ❌ 이메일 인증 없음
- ❌ 비밀번호 찾기/재설정 없음
- ❌ OAuth 소셜 로그인 없음

### User 테이블
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id CHAR(36) UNIQUE NOT NULL,        -- UUID
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,          -- bcrypt
    nickname VARCHAR(50) NOT NULL,
    profile_image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**상세 가이드**: `references/auth-simple-signup.md`

---

## 🎬 LiveKit 연동

### LiveKit이란?
```
WebRTC SFU (Selective Forwarding Unit) 서버
→ 브라우저 간 영상/음성 중계
→ 녹화 (Egress)
→ RTMP 송출 (Egress)
```

### 주요 기능

#### 1. 토큰 발급
```java
@Service
public class LiveKitService {
    
    public String createToken(String roomName, String participantName, boolean canPublish) {
        AccessToken token = new AccessToken(apiKey, apiSecret);
        token.setName(participantName);
        token.setIdentity(participantName);
        token.addGrants(
            new RoomJoin(true),
            new RoomName(roomName),
            new CanPublish(canPublish)
        );
        token.setTtl(Duration.ofHours(6));
        return token.toJwt();
    }
}
```

#### 2. 녹화 시작
```java
public String startRecording(String roomName, String outputPath) {
    EgressServiceClient client = EgressServiceClient.createClient(url, apiKey, apiSecret);
    
    RoomCompositeEgressRequest request = RoomCompositeEgressRequest.newBuilder()
        .setRoomName(roomName)
        .setFile(EncodedFileOutput.newBuilder()
            .setFilepath(outputPath)
            .setFileType(EncodedFileType.MP4)
            .build())
        .build();
    
    EgressInfo info = client.startRoomCompositeEgress(request).get();
    
    return info.getEgressId();  // ⭐ DB에 저장 필수!
}
```

#### 3. 녹화 중지
```java
public void stopRecording(String egressId) {
    EgressServiceClient client = EgressServiceClient.createClient(url, apiKey, apiSecret);
    client.stopEgress(egressId);
}
```

**상세 가이드**: `references/livekit-guide.md`

---

## 📋 API 엔드포인트

### Stream (WebRTC 세션)
| 메서드 | URL | 설명 |
|--------|-----|------|
| POST | /api/v1/media/stream/join | 스트림 참가 (토큰 발급) |
| POST | /api/v1/media/stream/{studioId}/leave | 스트림 퇴장 |
| POST | /api/v1/media/stream/{studioId}/end | 스트림 종료 |

### Recording (녹화)
| 메서드 | URL | 설명 |
|--------|-----|------|
| POST | /api/v1/media/record/start | 녹화 시작 |
| POST | /api/v1/media/record/{studioId}/stop | 녹화 중지 |
| POST | /api/v1/media/record/{studioId}/pause | 녹화 일시정지 |
| POST | /api/v1/media/record/{studioId}/resume | 녹화 재개 |

### Publish (RTMP 송출)
| 메서드 | URL | 설명 |
|--------|-----|------|
| POST | /api/v1/media/publish | 송출 시작 |
| POST | /api/v1/media/publish/stop | 송출 중지 |
| GET | /api/v1/media/publish/status | 송출 상태 조회 |

### ScreenShare (화면 공유)
| 메서드 | URL | 설명 |
|--------|-----|------|
| POST | /api/v1/media/screen-share/start | 화면 공유 시작 |
| POST | /api/v1/media/screen-share/stop | 화면 공유 중지 |

**전체 API**: `references/api-specifications.md`

---

## 🚀 개발 시작하기

### 1. Docker 환경 실행

```bash
# Docker Compose 실행
docker-compose up -d

# 서비스 확인
docker-compose ps

# 로그 확인
docker-compose logs -f
```

**서비스 접속**:
- MySQL: `localhost:3306` (core_user/core_password)
- PostgreSQL: `localhost:5432` (media_user/media_password)
- RabbitMQ UI: `http://localhost:15672` (admin/admin123)
- Redis: `localhost:6379`
- LiveKit: `ws://localhost:7880`
- MinIO Console: `http://localhost:9001` (minioadmin/minioadmin123)

### 2. 데이터베이스 초기화

```bash
# MySQL (Core Service)
mysql -h localhost -P 3306 -u core_user -pcore_password core_db < docker/mysql/init/schema.sql

# PostgreSQL (Media Service)
psql -h localhost -p 5432 -U media_user -d media_db -f docker/postgres/init/schema.sql
```

### 3. 백엔드 실행

```bash
# Eureka Server
cd eureka-server
./mvnw spring-boot:run

# Config Server
cd config-server
./mvnw spring-boot:run

# Gateway
cd gateway-service
./mvnw spring-boot:run

# Core Service
cd core-service
./mvnw spring-boot:run

# Media Service
cd media-service
./mvnw spring-boot:run
```

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

---

## 💻 개발 워크플로우

### 예시: 라이브 송출 전체 흐름

#### 1. 유저가 YouTube 연동 (Core Service)
```java
// DestinationController.java
@PostMapping("/api/destinations/connect")
public ResponseEntity<DestinationDto> connectYouTube(@RequestBody ConnectRequest request) {
    // OAuth 처리
    // connected_destinations 테이블에 저장 (access_token, stream_key 암호화)
}
```

#### 2. 스튜디오 생성 시 YouTube 선택 (Core Service)
```java
// StudioController.java
@PostMapping("/api/studios")
public ResponseEntity<StudioDto> createStudio(@RequestBody CreateStudioRequest request) {
    Studio studio = studioService.create(request);
    
    // studio_destination_map에 매핑 저장
    for (UUID destId : request.getDestinationIds()) {
        mapRepository.save(new StudioDestinationMap(studio.getId(), destId));
    }
}
```

#### 3. WebRTC 세션 참가 (Media Service)
```java
// StreamController.java
@PostMapping("/api/v1/media/stream/join")
public ResponseEntity<JoinResponse> joinStream(@RequestBody JoinRequest request) {
    // 1. LiveKit 토큰 발급
    String token = liveKitService.createToken(roomName, username, true);
    
    // 2. stream_sessions 테이블에 저장
    StreamSession session = streamSessionRepository.save(/* ... */);
    
    return ResponseEntity.ok(new JoinResponse(token, "ws://localhost:7880"));
}
```

#### 4. 라이브 송출 시작 (Media Service)
```java
// PublishController.java
@PostMapping("/api/v1/media/publish")
public ResponseEntity<PublishSessionDto> startPublish(@RequestBody StartPublishRequest request) {
    // 1. Core Service에 "이 스튜디오는 어디로 송출?" 질문
    List<DestinationDto> dests = coreServiceClient.getStudioDestinations(studioId);
    
    // 2. publish_sessions 생성
    PublishSession session = publishSessionRepository.save(/* ... */);
    
    // 3. 각 플랫폼별 LiveKit Egress로 RTMP 송출
    for (DestinationDto dest : dests) {
        String egressId = liveKitService.startRtmpPublish(
            roomName,
            dest.getRtmpUrl(),
            dest.getStreamKey()
        );
        
        // 4. publish_destinations 저장 (실시간 상태 추적)
        publishDestRepository.save(
            PublishDestination.builder()
                .publishSessionId(session.getId())
                .destinationId(dest.getId())
                .platform(dest.getPlatform())
                .rtmpUrl(dest.getRtmpUrl())
                .streamKeyEnc(encryptedStreamKey)
                .status("CONNECTED")
                .build()
        );
    }
    
    // 5. egress_id 저장 (중지 시 필요!)
    session.setEgressId(egressId);
    session.setStatus("LIVE");
    publishSessionRepository.save(session);
}
```

---

## 📚 참조 문서

### 필수 문서 (개발 전 반드시 읽기)

| 문서 | 내용 | 언제 보나 |
|------|------|----------|
| `database-erd.md` | **전체 ERD** (Core + Media) | 모든 개발 시작 전 |
| `auth-simple-signup.md` | 회원가입/로그인 상세 | Auth 개발 시 |
| `livekit-guide.md` | **LiveKit 개념 + 연동** | WebRTC/녹화/송출 개발 시 |
| `complete-code.md` | **복붙 가능한 완성 코드** | 빠른 구현 시 |

### 추가 문서

| 문서 | 내용 |
|------|------|
| `livekit-service.md` | LiveKitService 전체 코드 |
| `media-service-entities.md` | Media Service Entity 설계 |
| `global-common.md` | 공통 클래스 (ApiResponse, Security) |
| `feature-specifications.md` | 기능 명세서 (C, A, W, S, L 도메인) |
| `api-specifications.md` | API 명세서 (110+ 엔드포인트) |
| `msa-architecture.md` | MSA 설계 가이드 |
| `tech-stack-details.md` | 기술 스택 상세 (pom.xml, application.yml) |
| `api-test.md` | Postman + cURL 테스트 |
| `docker-compose.yml` | Docker 환경 설정 |

---

## 🎨 와이어프레임

**Figma**: https://www.figma.com/design/9feQqWFi0ixF6AoUr5oHnX/OneTakeStudio

**스크린샷**: `assets/` 폴더 (14개 화면)

---

## 🧪 테스트

### Unit Test
```java
@SpringBootTest
@AutoConfigureMockMvc
class StreamControllerTest {
    
    @MockBean
    private LiveKitService liveKitService;
    
    @Test
    void joinStream_shouldReturnToken() {
        given(liveKitService.createToken(any(), any(), anyBoolean()))
            .willReturn("mock-token");
        
        mockMvc.perform(post("/api/v1/media/stream/join")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock-token"));
    }
}
```

**상세**: `references/api-test.md`

---

## 🚢 배포 (k3s)

### Docker 이미지 빌드
```bash
# Spring Boot
./mvnw spring-boot:build-image -Dspring-boot.build-image.imageName=onetake/core-service:latest
./mvnw spring-boot:build-image -Dspring-boot.build-image.imageName=onetake/media-service:latest

# Frontend
docker build -t onetake/frontend:latest ./frontend
```

### k3s 배포
```bash
kubectl apply -f k8s/core-service.yaml
kubectl apply -f k8s/media-service.yaml
kubectl apply -f k8s/gateway.yaml
```

---

## 💡 개발 팁

### 1. Feign Client 사용 (Core ↔ Media)
```java
@FeignClient(name = "core-service")
public interface CoreServiceClient {
    
    @GetMapping("/internal/studios/{studioId}/destinations")
    List<DestinationDto> getStudioDestinations(@PathVariable("studioId") Long studioId);
}
```

### 2. RabbitMQ 이벤트 발행
```java
// Core Service
rabbitTemplate.convertAndSend(
    "studio.exchange",
    "studio.created",
    new StudioCreatedEvent(studioId, type)
);

// Media Service
@RabbitListener(queues = "media.studio.queue")
public void handleStudioCreated(StudioCreatedEvent event) {
    // WebRTC Room 초기화
}
```

### 3. egress_id는 반드시 저장!
```java
// ❌ 잘못된 예
String egressId = liveKitService.startRecording(roomName, path);
// DB에 저장 안 함 → 중지 불가!

// ✅ 올바른 예
String egressId = liveKitService.startRecording(roomName, path);
recording.setEgressId(egressId);  // 반드시 저장!
recordingRepository.save(recording);
```

---

## 🐛 트러블슈팅

### LiveKit 연결 실패
```bash
# LiveKit 서버 상태 확인
curl http://localhost:7880

# 로그 확인
docker logs onetake-livekit
```

### RabbitMQ 메시지 안 감
```bash
# RabbitMQ UI 접속
http://localhost:15672

# Queue 확인
# Bindings 확인
```

### DB 연결 실패
```bash
# MySQL 접속 확인
mysql -h localhost -P 3306 -u core_user -pcore_password core_db

# PostgreSQL 접속 확인
psql -h localhost -p 5432 -U media_user -d media_db
```

---

## 📅 개발 로드맵

### Phase 1: 기본 인프라 (1주)
- ✅ Eureka, Gateway, Config 설정
- ✅ Docker Compose 환경
- ✅ 회원가입/로그인

### Phase 2: WebRTC 세션 (2주)
- ✅ LiveKit 연동
- ✅ 토큰 발급 API
- ✅ 프론트 WebRTC 연결

### Phase 3: 녹화/송출 (2주)
- ✅ 녹화 시작/중지
- ✅ RTMP 송출
- ✅ Destination 연동

### Phase 4: 고급 기능 (2주)
- ✅ 실시간 채팅
- ✅ 마커 시스템
- ✅ 협업 기능

### Phase 5: AI 기능 (1주)
- ✅ AI 쇼츠 생성
- ✅ STT 자막

---

**이 Skill은 OneTakeStudio MSA 프로젝트의 완전한 개발 가이드입니다.**
**내부 BIGINT + 외부 UUID 설계, LiveKit 연동, Destination 분리 등 베스트 프랙티스를 모두 반영했습니다!** 🚀
