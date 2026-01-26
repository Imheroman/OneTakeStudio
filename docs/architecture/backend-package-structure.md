# OneTakeStudio 백엔드 패키지 구조 설계

## 프로젝트 개요
- **프로젝트명**: OneTakeStudio
- **설명**: 브라우저 기반 OBS 유사 스튜디오 (실시간 방송 송출, 녹화, 편집, AI 숏폼 생성)
- **기술 스택**: Spring Boot 3.5.x, Java 21, Maven
- **아키텍처**: Layered Architecture

---

## 0. 기존 프로젝트 현황 (C:\SSAFY\S14P11C206)

```
onetakestudio-backend/          # Maven 멀티모듈 (모노레포)
├── common/                     # 공통 라이브러리 (JWT)
├── core-service/               # MySQL 사용
├── media-service/              # PostgreSQL 사용 예정
└── pom.xml                     # 부모 pom
```

### 현재 문제점 (수정 필요)
1. media-service가 부모 pom을 상속받지 않음
2. 패키지명 불일치 (com.example vs com.onetakestudio)
3. media-service에 PostgreSQL 의존성 없음
4. 도메인 패키지 구조 없음

---

## 1. 저장소 전략: 멀티레포 (2개)

```
Repository 1: onetakestudio-core (MySQL)
Repository 2: onetakestudio-media (PostgreSQL)

※ common 모듈: 각 서비스 global 패키지에 복사 (JWT, 예외처리, 공통 DTO)
```

---

## 2. 서비스 구성 (기능명세서 기준)

### Core Service (MySQL)
| 도메인 | ID | 책임 | 주요 기능 |
|--------|-----|------|----------|
| Common | C | 공통 기능 | 세션 상태, GNB, 알림 센터 |
| Auth | A | 인증 | ID/소셜 로그인, 회원가입, 비밀번호 재설정 |
| Workspace | W | 방송국 환경 | 대시보드, 프로필, 파트너, 스토리지, 채널 연동 |
| Library | L | 영상 자산 | 영상 목록, 업로드, AI 쇼츠, 자막, Export |
| Studio | S | 방송 송출 | 스튜디오 설정, 씬/레이아웃, 채팅, 배너, 파트너 초대 |

### Media Service (PostgreSQL)
| 도메인 | 책임 | 주요 기능 |
|--------|------|----------|
| Stream | WebRTC/RTMP 세션 | 실시간 스트리밍 연결 |
| Recording | 녹화 관리 | 녹화 시작/종료/상태, S3 업로드 |
| Publish | 송출 관리 | 플랫폼별 RTMP 송출 |

---

## 3. Core Service 패키지 구조 (Layered Architecture)

```
core-service/
├── src/main/java/com/onetakestudio/core/
│   │
│   ├── CoreServiceApplication.java
│   │
│   ├── global/                          # 전역 설정
│   │   ├── config/
│   │   │   ├── SecurityConfig.java
│   │   │   ├── JpaConfig.java
│   │   │   ├── RedisConfig.java
│   │   │   ├── RabbitConfig.java
│   │   │   ├── S3Config.java
│   │   │   └── WebConfig.java
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java
│   │   │   ├── ErrorCode.java
│   │   │   ├── BusinessException.java
│   │   │   └── ErrorResponse.java
│   │   ├── security/
│   │   │   ├── jwt/
│   │   │   │   ├── JwtTokenProvider.java
│   │   │   │   ├── JwtAuthenticationFilter.java
│   │   │   │   └── JwtProperties.java
│   │   │   └── UserPrincipal.java
│   │   ├── common/
│   │   │   ├── BaseEntity.java
│   │   │   ├── BaseTimeEntity.java
│   │   │   └── ApiResponse.java
│   │   └── util/
│   │       └── ...
│   │
│   ├── auth/                            # A: 인증 도메인
│   │   ├── controller/
│   │   │   └── AuthController.java
│   │   ├── service/
│   │   │   ├── AuthService.java         # A-01~A-05
│   │   │   └── OAuthService.java        # A-02
│   │   ├── repository/
│   │   │   ├── UserRepository.java
│   │   │   └── RefreshTokenRepository.java
│   │   ├── entity/
│   │   │   ├── User.java
│   │   │   └── RefreshToken.java
│   │   └── dto/
│   │       └── ...
│   │
│   ├── workspace/                       # W: 워크스페이스 도메인
│   │   ├── controller/
│   │   │   ├── DashboardController.java  # W-01
│   │   │   ├── ProfileController.java    # W-03~W-05
│   │   │   ├── PartnerController.java    # W-02
│   │   │   ├── StorageController.java    # W-07~W-11
│   │   │   └── DestinationController.java # W-12~W-14
│   │   ├── service/
│   │   │   ├── DashboardService.java
│   │   │   ├── ProfileService.java
│   │   │   ├── PartnerService.java
│   │   │   ├── StorageService.java
│   │   │   └── DestinationService.java
│   │   ├── repository/
│   │   │   ├── PartnerRepository.java
│   │   │   ├── FileMetaRepository.java
│   │   │   └── DestinationRepository.java
│   │   ├── entity/
│   │   │   ├── Partner.java
│   │   │   ├── FileMeta.java
│   │   │   ├── Destination.java
│   │   │   └── Platform.java
│   │   └── dto/
│   │       └── ...
│   │
│   ├── library/                         # L: 라이브러리 도메인
│   │   ├── controller/
│   │   │   ├── VideoController.java      # L-01~L-04
│   │   │   ├── ShortsController.java     # L-06~L-09
│   │   │   └── UploadController.java     # L-02
│   │   ├── service/
│   │   │   ├── VideoService.java
│   │   │   ├── ShortsService.java
│   │   │   ├── AiHighlightService.java   # L-06
│   │   │   └── SubtitleService.java      # L-07, L-08
│   │   ├── repository/
│   │   │   ├── VideoRepository.java
│   │   │   ├── ShortsRepository.java
│   │   │   └── SubtitleRepository.java
│   │   ├── entity/
│   │   │   ├── Video.java
│   │   │   ├── Shorts.java
│   │   │   ├── Subtitle.java
│   │   │   └── VideoStatus.java
│   │   └── dto/
│   │       └── ...
│   │
│   ├── studio/                          # S: 스튜디오 도메인
│   │   ├── controller/
│   │   │   ├── StudioController.java     # S-01~S-03, W-15~W-16
│   │   │   ├── SceneController.java      # S-05~S-09
│   │   │   ├── BannerController.java     # S-16
│   │   │   ├── ChatController.java       # S-11, S-21
│   │   │   └── PartnerInviteController.java # S-18~S-20
│   │   ├── service/
│   │   │   ├── StudioService.java
│   │   │   ├── SceneService.java
│   │   │   ├── BannerService.java
│   │   │   ├── ChatService.java
│   │   │   └── PartnerInviteService.java
│   │   ├── repository/
│   │   │   ├── StudioRepository.java
│   │   │   ├── SceneRepository.java
│   │   │   ├── SourceRepository.java
│   │   │   └── BannerRepository.java
│   │   ├── entity/
│   │   │   ├── Studio.java
│   │   │   ├── StudioStatus.java
│   │   │   ├── Scene.java
│   │   │   ├── Source.java
│   │   │   └── Banner.java
│   │   └── dto/
│   │       └── ...
│   │
│   └── notification/                    # C-03: 알림 도메인
│       ├── controller/
│       │   └── NotificationController.java
│       ├── service/
│       │   └── NotificationService.java
│       ├── repository/
│       │   └── NotificationRepository.java
│       ├── entity/
│       │   └── Notification.java
│       └── dto/
│           └── ...
│
├── src/main/resources/
│   ├── application.yml
│   ├── application-local.yml
│   ├── application-dev.yml
│   ├── application-prod.yml
│   └── db/migration/
│       ├── V1__init_auth.sql
│       ├── V2__init_workspace.sql
│       ├── V3__init_studio.sql
│       └── V4__init_library.sql
│
└── src/test/
    └── java/com/onetakestudio/core/
        └── ...
```

---

## 4. Media Service 패키지 구조 (Layered Architecture)

```
media-service/
├── src/main/java/com/onetakestudio/media/
│   │
│   ├── MediaServiceApplication.java
│   │
│   ├── global/
│   │   ├── config/
│   │   │   ├── SecurityConfig.java
│   │   │   ├── JpaConfig.java       # PostgreSQL
│   │   │   ├── RedisConfig.java
│   │   │   ├── RabbitConfig.java
│   │   │   └── WebSocketConfig.java
│   │   ├── exception/
│   │   │   └── ...
│   │   └── common/
│   │       └── ...
│   │
│   ├── stream/                          # S-22: 실시간 송출
│   │   ├── controller/
│   │   │   └── StreamController.java
│   │   ├── service/
│   │   │   ├── WebRtcService.java      # S-04: 장치 초기화
│   │   │   └── LiveKitService.java     # SFU 연동
│   │   ├── repository/
│   │   │   └── StreamSessionRepository.java
│   │   ├── entity/
│   │   │   ├── StreamSession.java
│   │   │   └── SessionStatus.java
│   │   └── dto/
│   │       └── ...
│   │
│   ├── recording/                       # S-23: 녹화
│   │   ├── controller/
│   │   │   └── RecordingController.java
│   │   ├── service/
│   │   │   ├── RecordingService.java
│   │   │   └── S3UploadService.java
│   │   ├── repository/
│   │   │   └── RecordingSessionRepository.java
│   │   ├── entity/
│   │   │   ├── RecordingSession.java
│   │   │   └── RecordingStatus.java
│   │   └── dto/
│   │       └── ...
│   │
│   └── publish/                         # S-22: 플랫폼 송출
│       ├── controller/
│       │   └── PublishController.java
│       ├── service/
│       │   ├── PublishService.java
│       │   └── RtmpRelayService.java   # RTMP 릴레이
│       ├── repository/
│       │   └── PublishSessionRepository.java
│       ├── entity/
│       │   ├── PublishSession.java
│       │   └── PublishDestination.java
│       └── dto/
│           └── ...
│
├── src/main/resources/
│   ├── application.yml
│   └── db/migration/
│       ├── V1__init_stream.sql
│       └── V2__init_recording.sql
│
└── src/test/
    └── java/com/onetakestudio/media/
        └── ...
```

---

## 5. API 도메인별 분류 (API 명세서 기준)

### Core Service API (91개)
| 도메인 | API 수 | URL 패턴 |
|--------|--------|----------|
| 인증 | 8 | /auth/* |
| 사용자 | 8 | /users/me/* |
| 송출채널 | 6 | /destinations/* |
| 멤버 | 12 | /studios/{id}/members/* |
| 스튜디오 | 14 | /studios/* |
| 라이브 | 18 | 배너/마커/채팅/노트/에셋 |
| AI/클립 | 7 | /recordings/*, /clips/*, /ai/* |
| 라이브러리 | 7 | /library/* |
| 알림 | 3 | /notifications/* |
| 업로드 | 2 | /upload/* |
| 시스템 | 2 | /system/* |

### Media Service API (10개)
| 도메인 | API 수 | URL 패턴 |
|--------|--------|----------|
| 송출 | 3 | /media/publish/* |
| 녹화 | 4 | /media/record/* |
| 화면공유 | 2 | /media/screen-share/* |
| ICE서버 | 1 | /media/ice-servers |

---

## 6. 서비스 간 통신

```
┌─────────────────┐     RabbitMQ      ┌─────────────────┐
│  Core Service   │ ←─────────────────→ │  Media Service  │
│   (MySQL)       │                     │  (PostgreSQL)   │
└────────┬────────┘                     └────────┬────────┘
         │                                       │
         ├── recording.stopped (이벤트)          │
         ├── ai.job.completed (이벤트)           │
         └── REST API (동기 호출)                │
```

### 이벤트 목록
| 이벤트 | 발행자 | 구독자 | 설명 |
|--------|--------|--------|------|
| `recording.stopped` | Media | Core (AI/Library) | 녹화 종료 시 분석 시작 |
| `ai.job.completed` | Core (AI) | Core (Library/Notification) | AI 작업 완료 알림 |
| `destination.disconnected` | Core | Media | 채널 연동 해제 |

---

## 7. 구현 우선순위

### Phase 1 (Core 기본)
- global 설정 (Security, JPA, 예외처리)
- auth 도메인 (로그인, JWT)
- user 도메인 (프로필)
- studio 도메인 (CRUD)

### Phase 2 (Core 확장)
- member 도메인 (초대, 권한)
- destination 도메인 (채널 연동)
- live 도메인 (배너, 마커)

### Phase 3 (Media)
- stream 도메인 (WebRTC)
- recording 도메인 (녹화)
- publish 도메인 (송출)

### Phase 4 (AI/라이브러리)
- library 도메인 (파일 관리)
- ai 도메인 (클립/STT)
- notification 도메인 (알림)

---

## 8. 주요 파일 목록

### Core Service
- `global/config/SecurityConfig.java` - Spring Security 설정
- `global/security/jwt/JwtTokenProvider.java` - JWT 발급/검증
- `global/exception/GlobalExceptionHandler.java` - 예외 처리
- `auth/service/AuthService.java` - 인증 로직
- `studio/entity/Studio.java` - 스튜디오 엔티티

### Media Service
- `stream/service/WebRtcService.java` - WebRTC 연결 관리
- `recording/service/RecordingService.java` - 녹화 관리

---

## 9. 검증 방법

### Core Service
```bash
cd core-service
./mvnw clean package
./mvnw test
```

### Media Service
```bash
cd media-service
./mvnw clean package
./mvnw test
```

### 통합 테스트
1. Docker Compose로 MySQL, PostgreSQL, Redis, RabbitMQ 실행
2. 두 서비스 동시 실행
3. Postman/curl로 API 테스트
4. 녹화 → 라이브러리 반영 → AI 작업 E2E 플로우 테스트
