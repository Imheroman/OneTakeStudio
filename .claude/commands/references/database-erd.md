# OneTakeStudio 데이터베이스 ERD (최종 통합 버전)

## 📌 설계 원칙

```
✅ 내부 PK: BIGINT (조인 성능)
✅ 외부 노출 ID: UUID (보안 + MSA)
✅ Destination: Core + Media 분리 (단일 책임)
✅ egress_id 필수 포함 (LiveKit 연동)
```

---

## 데이터베이스 구조

```
┌─────────────────────────────────────────────┐
│         Core Service (MySQL)                 │
│  - users (id + user_id)                      │
│  - studios (id + studio_id)                  │
│  - studio_members                            │
│  - member_invites                            │
│  - scenes                                    │
│  - scene_sources                             │
│  - connected_destinations (채널 연동 정보)   │
│  - studio_destination_map                    │
│  - refresh_tokens                            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│       Media Service (PostgreSQL)             │
│  - stream_sessions (WebRTC 세션)            │
│  - publish_sessions (송출 세션)              │
│  - publish_destinations (송출 채널 상태)     │
│  - recordings (녹화본)                       │
│  - recording_events (녹화 이벤트)            │
│  - clips (클립/쇼츠)                         │
│  - markers (마커)                            │
│  - banners (배너)                            │
└─────────────────────────────────────────────┘
```

---

## Core Service (MySQL - core_db)

### 1. users (사용자)

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '내부 PK (조인용)',
    user_id CHAR(36) UNIQUE NOT NULL COMMENT '외부 노출 UUID',
    email VARCHAR(255) UNIQUE NOT NULL COMMENT '이메일 (로그인 ID)',
    password VARCHAR(255) NOT NULL COMMENT 'bcrypt 해시',
    nickname VARCHAR(50) NOT NULL COMMENT '닉네임',
    profile_image_url VARCHAR(500) COMMENT 'S3 프로필 이미지',
    email_verified BOOLEAN DEFAULT FALSE COMMENT '이메일 인증 완료 여부',
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_email (email),
    INDEX idx_email_verified (email_verified),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Java Entity**:
```java
@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true, nullable = false, length = 36)
    private String userId;  // UUID를 String으로 저장

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String nickname;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @PrePersist
    public void prePersist() {
        if (userId == null) {
            userId = UUID.randomUUID().toString();
        }
    }
}
```

---

### 1-1. email_verifications (이메일 인증 코드)

```sql
CREATE TABLE email_verifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL COMMENT '인증 대상 이메일',
    verification_code VARCHAR(6) NOT NULL COMMENT '6자리 인증 코드',
    type VARCHAR(20) NOT NULL COMMENT 'SIGNUP/PASSWORD_RESET',
    expires_at DATETIME NOT NULL COMMENT '만료 시간 (5분)',
    verified BOOLEAN DEFAULT FALSE COMMENT '인증 완료 여부',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_code (verification_code),
    INDEX idx_type (type),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 1-2. password_reset_tokens (비밀번호 재설정 토큰)

```sql
CREATE TABLE password_reset_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT 'users.id (FK)',
    token CHAR(36) UNIQUE NOT NULL COMMENT 'UUID 토큰',
    expires_at DATETIME NOT NULL COMMENT '만료 시간 (1시간)',
    used BOOLEAN DEFAULT FALSE COMMENT '사용 완료 여부',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 2. studios (스튜디오)

```sql
CREATE TABLE studios (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    studio_id CHAR(36) UNIQUE NOT NULL COMMENT '외부 노출 UUID',
    owner_id BIGINT NOT NULL COMMENT 'users.id (FK)',
    title VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'upcoming' COMMENT 'upcoming/live/ended',
    phantom_enabled BOOLEAN DEFAULT FALSE COMMENT '팬텀 모드 (백스테이지)',
    scheduled_at DATETIME NOT NULL COMMENT '예정 시작 시간',
    started_at DATETIME COMMENT '실제 시작 시간',
    ended_at DATETIME COMMENT '종료 시간',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_studio_id (studio_id),
    INDEX idx_owner (owner_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Java Entity**:
```java
@Entity
@Table(name = "studios")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Studio extends BaseTimeEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "studio_id", unique = true, nullable = false, length = 36)
    private String studioId;
    
    @Column(name = "owner_id", nullable = false)
    private Long ownerId;
    
    @Column(nullable = false, length = 100)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private StudioStatus status = StudioStatus.UPCOMING;
    
    @Column(name = "phantom_enabled")
    @Builder.Default
    private Boolean phantomEnabled = false;
    
    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;
    
    @Column(name = "started_at")
    private LocalDateTime startedAt;
    
    @Column(name = "ended_at")
    private LocalDateTime endedAt;
    
    @PrePersist
    public void prePersist() {
        if (studioId == null) {
            studioId = UUID.randomUUID().toString();
        }
    }
}

public enum StudioStatus {
    UPCOMING, LIVE, ENDED
}
```

---

### 3. studio_members (스튜디오 멤버)

```sql
CREATE TABLE studio_members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    studio_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL COMMENT 'owner/co-pilot/guest',
    status VARCHAR(20) DEFAULT 'offline' COMMENT 'online/offline',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_studio_user (studio_id, user_id),
    INDEX idx_studio (studio_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;
```

---

### 4. member_invites (멤버 초대)

```sql
CREATE TABLE member_invites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invite_id CHAR(36) UNIQUE NOT NULL,
    studio_id BIGINT NOT NULL,
    inviter_id BIGINT NOT NULL COMMENT '초대한 사람',
    invitee_username VARCHAR(255) NOT NULL COMMENT '초대받을 사람 아이디',
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/accepted/rejected/expired',
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_studio (studio_id),
    INDEX idx_status (status),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;
```

---

### 5. scenes (씬/장면)

```sql
CREATE TABLE scenes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    scene_id CHAR(36) UNIQUE NOT NULL,
    studio_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    layout VARCHAR(20) NOT NULL COMMENT 'preset_1/preset_2/custom',
    is_active BOOLEAN DEFAULT FALSE COMMENT '현재 활성 씬',
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
    INDEX idx_studio (studio_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;
```

---

### 6. scene_sources (씬 소스/레이어)

```sql
CREATE TABLE scene_sources (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    source_id CHAR(36) UNIQUE NOT NULL,
    scene_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL COMMENT 'camera/screen/media/image/text',
    position JSON NOT NULL COMMENT '{"x":0,"y":0,"width":1280,"height":720,"z_index":1}',
    meta JSON COMMENT '{"device_id":"videoinput:0","volume":0.8}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    INDEX idx_scene (scene_id)
) ENGINE=InnoDB;
```

---

### 7. connected_destinations (연동된 송출 채널) ⭐

```sql
CREATE TABLE connected_destinations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    destination_id CHAR(36) UNIQUE NOT NULL COMMENT '외부 노출 UUID',
    user_id BIGINT NOT NULL COMMENT 'users.id (FK)',
    platform VARCHAR(20) NOT NULL COMMENT 'youtube/twitch/chzzk/custom',
    channel_id VARCHAR(100) NOT NULL COMMENT '플랫폼 채널 ID',
    channel_name VARCHAR(100) NOT NULL COMMENT '채널 이름',
    profile_image_url VARCHAR(500) COMMENT '채널 프로필 이미지',
    access_token_enc BLOB COMMENT '암호화된 OAuth Access Token',
    refresh_token_enc BLOB COMMENT '암호화된 OAuth Refresh Token',
    stream_key_enc BLOB COMMENT '암호화된 Stream Key',
    token_expires_at DATETIME COMMENT '토큰 만료 시간',
    is_connected BOOLEAN DEFAULT TRUE,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    meta JSON COMMENT '플랫폼별 추가 정보',
    deleted_at DATETIME COMMENT 'Soft Delete',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_destination_id (destination_id),
    INDEX idx_user (user_id),
    INDEX idx_platform (platform),
    INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB;
```

**역할**: OAuth 인증, 채널 메타데이터, 토큰 관리

---

### 8. studio_destination_map (스튜디오-채널 매핑)

```sql
CREATE TABLE studio_destination_map (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    studio_id BIGINT NOT NULL,
    destination_id BIGINT NOT NULL COMMENT 'connected_destinations.id',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES connected_destinations(id) ON DELETE CASCADE,
    UNIQUE KEY uk_studio_dest (studio_id, destination_id),
    INDEX idx_studio (studio_id),
    INDEX idx_destination (destination_id)
) ENGINE=InnoDB;
```

---

### 9. refresh_tokens (리프레시 토큰)

```sql
CREATE TABLE refresh_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    token_id CHAR(36) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    refresh_token VARCHAR(500) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at),
    INDEX idx_revoked (revoked)
) ENGINE=InnoDB;
```

---

## Media Service (PostgreSQL - media_db)

### 10. stream_sessions (WebRTC 세션)

```sql
CREATE TABLE stream_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_key UUID UNIQUE NOT NULL,
    studio_id BIGINT NOT NULL COMMENT 'Core의 studios.id',
    user_id BIGINT NOT NULL COMMENT 'Core의 users.id',
    participant_identity VARCHAR(100) NOT NULL COMMENT 'LiveKit 참가자 ID',
    token VARCHAR(1000) NOT NULL COMMENT 'LiveKit JWT Token',
    role VARCHAR(20) NOT NULL COMMENT 'host/viewer',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'left', 'ended')),
    server_url VARCHAR(255) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMPTZ,
    
    INDEX idx_session_key (session_key),
    INDEX idx_studio (studio_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status)
);
```

---

### 11. publish_sessions (송출 세션) ⭐

```sql
CREATE TABLE publish_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_key UUID UNIQUE NOT NULL COMMENT '외부 노출 ID',
    studio_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL COMMENT '송출 시작한 사용자',
    egress_id VARCHAR(100) COMMENT 'LiveKit Egress ID (송출 중지 시 필수)',
    status VARCHAR(20) DEFAULT 'STARTING' 
        CHECK (status IN ('STARTING', 'LIVE', 'STOPPING', 'STOPPED', 'ERROR')),
    started_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_session_key (session_key),
    INDEX idx_studio (studio_id),
    INDEX idx_status (status)
);
```

**egress_id**: LiveKit으로 송출 중지 요청 시 반드시 필요!

---

### 12. publish_destinations (송출 채널 상태) ⭐

```sql
CREATE TABLE publish_destinations (
    id BIGSERIAL PRIMARY KEY,
    publish_session_id BIGINT NOT NULL,
    destination_id BIGINT NOT NULL COMMENT 'Core의 connected_destinations.id (논리적 참조)',
    platform VARCHAR(20) NOT NULL,
    channel_name VARCHAR(100),
    rtmp_url VARCHAR(500) NOT NULL,
    stream_key_enc BYTEA NOT NULL COMMENT '암호화된 Stream Key',
    status VARCHAR(20) DEFAULT 'CONNECTED' 
        CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'ERROR')),
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    error_message TEXT,
    
    FOREIGN KEY (publish_session_id) REFERENCES publish_sessions(id) ON DELETE CASCADE,
    INDEX idx_publish_session (publish_session_id),
    INDEX idx_status (status)
);
```

**역할**: 실시간 RTMP 연결 상태 추적

---

### 13. publish_events (송출 이벤트 로그)

```sql
CREATE TABLE publish_events (
    id BIGSERIAL PRIMARY KEY,
    publish_session_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL COMMENT 'started/stopped/error/reconnected',
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (publish_session_id) REFERENCES publish_sessions(id) ON DELETE CASCADE,
    INDEX idx_publish_session (publish_session_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);
```

---

### 14. recordings (녹화본)

```sql
CREATE TABLE recordings (
    id BIGSERIAL PRIMARY KEY,
    recording_key UUID UNIQUE NOT NULL COMMENT '외부 노출 ID',
    studio_id BIGINT NOT NULL,
    owner_user_id BIGINT NOT NULL,
    publish_session_id BIGINT COMMENT 'publish_sessions.id (NULL 가능)',
    egress_id VARCHAR(100) COMMENT 'LiveKit Egress ID (녹화 중지 시 필수)',
    title VARCHAR(100) NOT NULL,
    quality VARCHAR(20) NOT NULL COMMENT 'SD/HD/FHD/4K',
    storage VARCHAR(20) DEFAULT 'cloud' COMMENT 'local/cloud',
    status VARCHAR(20) DEFAULT 'RECORDING' 
        CHECK (status IN ('RECORDING', 'PROCESSING', 'READY', 'FAILED', 'DELETED')),
    duration_sec INT,
    file_size BIGINT COMMENT '파일 크기 (bytes)',
    file_path VARCHAR(500) COMMENT 'S3 key or local path',
    url VARCHAR(500) COMMENT 'S3 URL',
    thumbnail_url VARCHAR(500),
    started_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (publish_session_id) REFERENCES publish_sessions(id) ON DELETE SET NULL,
    INDEX idx_recording_key (recording_key),
    INDEX idx_studio (studio_id),
    INDEX idx_owner (owner_user_id),
    INDEX idx_status (status)
);
```

---

### 15. recording_events (녹화 이벤트 로그)

```sql
CREATE TABLE recording_events (
    id BIGSERIAL PRIMARY KEY,
    recording_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL COMMENT 'started/paused/resumed/stopped/completed/failed',
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
    INDEX idx_recording (recording_id),
    INDEX idx_event_type (event_type)
);
```

---

### 16. clips (클립/쇼츠)

```sql
CREATE TABLE clips (
    id BIGSERIAL PRIMARY KEY,
    clip_id UUID UNIQUE NOT NULL,
    recording_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    start_time_sec INT NOT NULL,
    end_time_sec INT NOT NULL,
    duration_sec INT NOT NULL,
    format VARCHAR(20) NOT NULL COMMENT 'mp4/mov/shorts',
    status VARCHAR(20) DEFAULT 'PROCESSING' 
        CHECK (status IN ('PROCESSING', 'READY', 'FAILED')),
    url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    srt_url VARCHAR(500) COMMENT '자막 파일 URL',
    ai_score DECIMAL(5,2) COMMENT 'AI 하이라이트 점수 (0-100)',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ COMMENT '임시 클립 만료 시간',
    
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
    INDEX idx_clip_id (clip_id),
    INDEX idx_recording (recording_id),
    INDEX idx_status (status)
);
```

---

### 17. markers (마커/북마크)

```sql
CREATE TABLE markers (
    id BIGSERIAL PRIMARY KEY,
    marker_id UUID UNIQUE NOT NULL,
    recording_id BIGINT NOT NULL,
    studio_id BIGINT NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    timestamp_sec INT NOT NULL COMMENT '녹화 시작 후 경과 시간 (초)',
    label VARCHAR(100),
    color VARCHAR(10) DEFAULT '#FFCC00',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
    INDEX idx_marker_id (marker_id),
    INDEX idx_recording (recording_id),
    INDEX idx_studio (studio_id),
    INDEX idx_timestamp (timestamp_sec)
);
```

---

### 18. banners (배너)

```sql
CREATE TABLE banners (
    id BIGSERIAL PRIMARY KEY,
    banner_id UUID UNIQUE NOT NULL,
    studio_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL COMMENT 'text/ticker/timer',
    content TEXT NOT NULL,
    position VARCHAR(30) COMMENT 'top/bottom/left/right',
    is_active BOOLEAN DEFAULT FALSE,
    style JSONB COMMENT '{"font":"Arial","size":24,"color":"#FFF"}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_banner_id (banner_id),
    INDEX idx_studio (studio_id),
    INDEX idx_active (is_active)
);
```

---

## 초기 데이터베이스 생성 스크립트

### Core Service (MySQL)

**core_schema.sql**:
```sql
CREATE DATABASE IF NOT EXISTS core_db 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE core_db;

-- 위의 테이블 1~9 전부 CREATE TABLE...
```

### Media Service (PostgreSQL)

**media_schema.sql**:
```sql
CREATE DATABASE media_db;

\c media_db;

CREATE SCHEMA IF NOT EXISTS streaming;

SET search_path TO streaming;

-- 위의 테이블 10~18 전부 CREATE TABLE...
```

---

## ERD 다이어그램

### Core Service

```
┌─────────────┐
│   users     │
│─────────────│
│ PK id       │──┐
│ UK user_id  │  │ 1
└─────────────┘  │
                 │ N
          ┌──────────────┐         ┌──────────────────┐
          │   studios    │ 1    N  │ studio_members   │
          │──────────────│─────────│──────────────────│
          │ PK id        │         │ FK studio_id     │
          │ UK studio_id │         │ FK user_id       │
          │ FK owner_id  │         └──────────────────┘
          └──────────────┘
                 │ 1
                 │ N
          ┌──────────────┐
          │   scenes     │
          │──────────────│
          │ PK id        │
          │ FK studio_id │
          └──────────────┘
                 │ 1
                 │ N
          ┌───────────────┐
          │ scene_sources │
          │───────────────│
          │ PK id         │
          │ FK scene_id   │
          └───────────────┘

┌──────────────────────┐
│ connected_dest       │
│──────────────────────│
│ PK id                │──┐
│ UK destination_id    │  │
│ FK user_id           │  │
└──────────────────────┘  │
                          │ N
                          │ N
                 ┌────────────────────┐
                 │ studio_dest_map    │
                 │────────────────────│
                 │ FK studio_id       │
                 │ FK destination_id  │
                 └────────────────────┘
```

### Media Service

```
┌─────────────────┐
│ publish_sessions│
│─────────────────│
│ PK id           │──┐
│ UK session_key  │  │ 1
│    egress_id    │  │
└─────────────────┘  │ N
                     │
              ┌──────────────────┐
              │ publish_dest     │
              │──────────────────│
              │ FK publish_id    │
              │    stream_key_enc│
              └──────────────────┘

┌─────────────────┐
│   recordings    │
│─────────────────│
│ PK id           │──┐
│ UK recording_key│  │ 1
│    egress_id    │  │
└─────────────────┘  ├─ N ─→ clips
                     │
                     └─ N ─→ markers
```

---

**이 ERD는 팀원 스킬의 장점(내부 BIGINT + 외부 UUID, egress_id)과 내 스킬의 장점(Destination 분리)을 모두 반영한 최종 버전입니다!** 🚀
