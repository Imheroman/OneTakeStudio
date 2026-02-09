# Entity 설계 (실제 ERD 기준)

## DB 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     MySQL (Core Service)                    │
│  users, studios, studio_members, clips, ai_jobs, etc.      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Streaming)                    │
│  destination_connections, publish_sessions, recordings,     │
│  stream_sessions, etc.                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Media Service 테이블 (PostgreSQL - streaming 스키마)

| 테이블 | 설명 |
|--------|------|
| `destination_connections` | 송출 채널 연동 (YouTube, Twitch 등) |
| `publish_sessions` | 송출 세션 |
| `publish_session_destinations` | 동시 송출 대상 |
| `publish_events` | 송출 이벤트 로그 |
| `recordings` | 녹화 |
| `recording_events` | 녹화 이벤트 로그 |
| `stream_sessions` | WebRTC 세션 |

---

## 1. DestinationConnection (송출 채널 연동)

### Entity
```java
package com.onetakestudio.media.destination.entity;

import com.onetakestudio.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "destination_connections", schema = "streaming")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DestinationConnection extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;  // Core Service users.id (MySQL BIGINT)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Platform platform;

    @Column(name = "external_id")
    private String externalId;

    @Column(name = "display_name")
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ConnectionStatus status = ConnectionStatus.ACTIVE;

    // 암호화된 토큰 (BYTEA → byte[])
    @Column(name = "access_token_enc")
    private byte[] accessTokenEnc;

    @Column(name = "refresh_token_enc")
    private byte[] refreshTokenEnc;

    @Column(name = "token_expires_at")
    private OffsetDateTime tokenExpiresAt;

    @Column(name = "stream_key_enc")
    private byte[] streamKeyEnc;

    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private String meta = "{}";

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    // 상태 변경 메서드
    public void revoke() {
        this.status = ConnectionStatus.REVOKED;
    }

    public void softDelete() {
        this.deletedAt = OffsetDateTime.now();
    }

    public boolean isActive() {
        return this.status == ConnectionStatus.ACTIVE && this.deletedAt == null;
    }
}
```

### Enum
```java
// Platform.java
public enum Platform {
    YOUTUBE, TWITCH, AFREECA, CHZZK, OTHER
}

// ConnectionStatus.java
public enum ConnectionStatus {
    ACTIVE, REVOKED, EXPIRED, ERROR
}
```

---

## 2. PublishSession (송출 세션)

### Entity
```java
package com.onetakestudio.media.publish.entity;

import com.onetakestudio.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "publish_sessions", schema = "streaming")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PublishSession extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_key", nullable = false, unique = true)
    @Builder.Default
    private UUID sessionKey = UUID.randomUUID();

    @Column(name = "studio_id", nullable = false)
    private Long studioId;  // Core Service studios.id (MySQL BIGINT)

    @Column(name = "started_by")
    private Long startedBy;  // Core Service users.id (MySQL BIGINT)

    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PublishStatus status = PublishStatus.CREATED;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @Column(name = "egress_id")
    private String egressId;  // LiveKit Egress ID (송출 중지에 사용)

    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private String config = "{}";

    @OneToMany(mappedBy = "publishSession", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PublishSessionDestination> destinations = new ArrayList<>();

    // 상태 변경 메서드
    public void start(String egressId) {
        this.status = PublishStatus.STARTING;
        this.egressId = egressId;
        this.startedAt = OffsetDateTime.now();
    }

    public void goLive() {
        this.status = PublishStatus.LIVE;
    }

    public void stop() {
        this.status = PublishStatus.STOPPING;
    }

    public void end() {
        this.status = PublishStatus.ENDED;
        this.endedAt = OffsetDateTime.now();
    }

    public void fail() {
        this.status = PublishStatus.FAILED;
        this.endedAt = OffsetDateTime.now();
    }

    public void addDestination(PublishSessionDestination destination) {
        destinations.add(destination);
        destination.setPublishSession(this);
    }
}
```

### PublishSessionDestination (동시 송출 대상)
```java
package com.onetakestudio.media.publish.entity;

import com.onetakestudio.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "publish_session_destinations", schema = "streaming")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PublishSessionDestination extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publish_session_id", nullable = false)
    @Setter(AccessLevel.PACKAGE)
    private PublishSession publishSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", nullable = false)
    private DestinationConnection destination;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PublishStatus status = PublishStatus.CREATED;

    @Column(name = "stream_url")
    private String streamUrl;

    @Column(name = "stream_key_enc")
    private byte[] streamKeyEnc;

    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private String meta = "{}";

    // 상태 변경
    public void connect() {
        this.status = PublishStatus.LIVE;
    }

    public void disconnect() {
        this.status = PublishStatus.ENDED;
    }

    public void fail() {
        this.status = PublishStatus.FAILED;
    }
}
```

### Enum
```java
// PublishStatus.java
public enum PublishStatus {
    CREATED, STARTING, LIVE, STOPPING, ENDED, FAILED
}
```

---

## 3. PublishEvent (송출 이벤트 로그)

```java
package com.onetakestudio.media.publish.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "publish_events", schema = "streaming")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PublishEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publish_session_id", nullable = false)
    private PublishSession publishSession;

    @Column(name = "event_type", nullable = false)
    private String eventType;  // STATE_CHANGE, RTMP_CONNECTED, ERROR 등

    @Column(nullable = false)
    @Builder.Default
    private String level = "INFO";

    private String message;

    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private String data = "{}";

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    // 팩토리 메서드
    public static PublishEvent info(PublishSession session, String type, String message) {
        return PublishEvent.builder()
                .publishSession(session)
                .eventType(type)
                .level("INFO")
                .message(message)
                .build();
    }

    public static PublishEvent error(PublishSession session, String type, String message, String data) {
        return PublishEvent.builder()
                .publishSession(session)
                .eventType(type)
                .level("ERROR")
                .message(message)
                .data(data)
                .build();
    }
}
```

---

## 4. Recording (녹화)

### Entity
```java
package com.onetakestudio.media.recording.entity;

import com.onetakestudio.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "recordings", schema = "streaming")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Recording extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recording_key", nullable = false, unique = true)
    @Builder.Default
    private UUID recordingKey = UUID.randomUUID();

    @Column(name = "studio_id", nullable = false)
    private Long studioId;  // Core Service studios.id (MySQL BIGINT)

    @Column(name = "created_by")
    private Long createdBy;  // Core Service users.id (MySQL BIGINT)

    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RecordingStatus status = RecordingStatus.RECORDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RecordingQuality quality = RecordingQuality.P1080;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StorageType storage = StorageType.CLOUD;

    @Column(name = "egress_id")
    private String egressId;  // LiveKit Egress ID

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private String meta = "{}";

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    // 상태 변경 메서드
    public void start(String egressId) {
        this.egressId = egressId;
        this.status = RecordingStatus.RECORDING;
        this.startedAt = OffsetDateTime.now();
    }

    public void pause() {
        this.status = RecordingStatus.PAUSED;
    }

    public void resume() {
        this.status = RecordingStatus.RECORDING;
    }

    public void stop() {
        this.status = RecordingStatus.PROCESSING;
        this.endedAt = OffsetDateTime.now();
        if (this.startedAt != null) {
            this.durationMs = java.time.Duration.between(startedAt, endedAt).toMillis();
        }
    }

    public void complete(String fileUrl, Long fileSize, String thumbnailUrl, Long durationMs) {
        this.status = RecordingStatus.COMPLETED;
        this.fileUrl = fileUrl;
        this.fileSize = fileSize;
        this.thumbnailUrl = thumbnailUrl;
        if (durationMs != null) {
            this.durationMs = durationMs;
        }
    }

    public void fail() {
        this.status = RecordingStatus.FAILED;
        this.endedAt = OffsetDateTime.now();
    }

    public void softDelete() {
        this.deletedAt = OffsetDateTime.now();
    }

    public boolean isActive() {
        return this.status == RecordingStatus.RECORDING || this.status == RecordingStatus.PAUSED;
    }
}
```

### Enum
```java
// RecordingStatus.java
public enum RecordingStatus {
    RECORDING, PAUSED, PROCESSING, COMPLETED, FAILED
}

// RecordingQuality.java
public enum RecordingQuality {
    P720, P1080, P4K;

    public static RecordingQuality fromApi(String value) {
        if (value == null) {
            throw new IllegalArgumentException("quality is null");
        }
        return switch (value.toLowerCase()) {
            case "720p" -> P720;
            case "1080p" -> P1080;
            case "4k" -> P4K;
            default -> throw new IllegalArgumentException("invalid quality: " + value);
        };
    }
}

// StorageType.java
public enum StorageType {
    LOCAL, CLOUD
}
```

---

## 5. RecordingEvent (녹화 이벤트 로그)

```java
package com.onetakestudio.media.recording.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "recording_events", schema = "streaming")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RecordingEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recording_id", nullable = false)
    private Recording recording;

    @Column(name = "event_type", nullable = false)
    private String eventType;  // STARTED, PAUSED, RESUMED, STOPPED, UPLOADED, ERROR

    @Column(nullable = false)
    @Builder.Default
    private String level = "INFO";

    private String message;

    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private String data = "{}";

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    // 팩토리 메서드
    public static RecordingEvent started(Recording recording) {
        return RecordingEvent.builder()
                .recording(recording)
                .eventType("STARTED")
                .message("녹화가 시작되었습니다")
                .build();
    }

    public static RecordingEvent stopped(Recording recording) {
        return RecordingEvent.builder()
                .recording(recording)
                .eventType("STOPPED")
                .message("녹화가 중지되었습니다")
                .build();
    }

    public static RecordingEvent error(Recording recording, String message, String data) {
        return RecordingEvent.builder()
                .recording(recording)
                .eventType("ERROR")
                .level("ERROR")
                .message(message)
                .data(data)
                .build();
    }
}
```

---

## 6. StreamSession (WebRTC 세션)

```java
package com.onetakestudio.media.stream.entity;

import com.onetakestudio.media.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "stream_sessions", schema = "streaming")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class StreamSession extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_key", nullable = false, unique = true)
    @Builder.Default
    private UUID sessionKey = UUID.randomUUID();

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SessionRole role = SessionRole.VIEWER;  // HOST, GUEST, VIEWER

    @Column(nullable = false)
    private String token;

    @Column(name = "server_url", nullable = false)
    private String serverUrl;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "disconnected_at")
    private OffsetDateTime disconnectedAt;

    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private String meta = "{}";

    // 연결 해제
    public void disconnect() {
        this.disconnectedAt = OffsetDateTime.now();
    }

    public boolean isExpired() {
        return OffsetDateTime.now().isAfter(expiresAt);
    }

    public boolean isActive() {
        return disconnectedAt == null && !isExpired();
    }
}
```

---

### Enum
```java
// SessionRole.java
public enum SessionRole {
    HOST, GUEST, VIEWER
}
```

---

## 7. BaseTimeEntity (공통)

```java
package com.onetakestudio.media.global.common;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.OffsetDateTime;

@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseTimeEntity {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

---

## ERD 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL - streaming schema                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐         ┌──────────────────────┐              │
│  │ destination_connections│         │    stream_sessions   │              │
│  ├──────────────────────┤         ├──────────────────────┤              │
│  │ id (PK)              │         │ id (PK)              │              │
│  │ user_id (BIGINT, Core)│        │ session_key (UUID)   │              │
│  │ platform             │         │ studio_id (BIGINT, Core)│           │
│  │ external_id          │         │ user_id (BIGINT, Core)│            │
│  │ display_name         │         │ role                 │              │
│  │ status               │         │ token                │              │
│  │ access_token_enc     │         │ server_url           │              │
│  │ refresh_token_enc    │         │ expires_at           │              │
│  │ stream_key_enc       │         │ disconnected_at      │              │
│  └──────────┬───────────┘         └──────────────────────┘              │
│             │                                                            │
│             │ 1:N                                                        │
│             ▼                                                            │
│  ┌──────────────────────┐         ┌──────────────────────┐              │
│  │   publish_sessions   │◄────────┤ publish_session_dest │              │
│  ├──────────────────────┤   1:N   ├──────────────────────┤              │
│  │ id (PK)              │         │ id (PK)              │              │
│  │ session_key (UUID)   │         │ publish_session_id   │──────┐       │
│  │ studio_id (BIGINT, Core)│      │ destination_id       │──────┼───┐   │
│  │ started_by (BIGINT, Core)│     │ status               │      │   │   │
│  │ title                │         │ stream_url           │      │   │   │
│  │ status               │         └──────────────────────┘      │   │   │
│  │ started_at           │                                       │   │   │
│  │ ended_at             │◄──────────────────────────────────────┘   │   │
│  │ egress_id            │                                           │   │
│  └──────────┬───────────┘                                           │   │
│             │                     ┌─────────────────────────────────┘   │
│             │ 1:N                 │                                     │
│             ▼                     ▼                                     │
│  ┌──────────────────────┐         │                                     │
│  │   publish_events     │         │                                     │
│  ├──────────────────────┤         │                                     │
│  │ id (PK)              │         │                                     │
│  │ publish_session_id   │         │                                     │
│  │ event_type           │         │                                     │
│  │ level                │         │                                     │
│  │ message              │         │                                     │
│  └──────────────────────┘         │                                     │
│                                   │                                     │
│  ┌──────────────────────┐         │                                     │
│  │     recordings       │         │                                     │
│  ├──────────────────────┤         │                                     │
│  │ id (PK)              │         │                                     │
│  │ recording_key (UUID) │         │                                     │
│  │ studio_id (BIGINT, Core)│      │                                     │
│  │ created_by (BIGINT, Core)│     │                                     │
│  │ title                │         │                                     │
│  │ status               │         │                                     │
│  │ quality              │         │                                     │
│  │ egress_id            │         │                                     │
│  │ file_url             │         │                                     │
│  │ file_size            │         │                                     │
│  └──────────┬───────────┘         │                                     │
│             │                     │                                     │
│             │ 1:N                 │                                     │
│             ▼                     │                                     │
│  ┌──────────────────────┐         │                                     │
│  │  recording_events    │         │                                     │
│  ├──────────────────────┤         │                                     │
│  │ id (PK)              │         │                                     │
│  │ recording_id         │         │                                     │
│  │ event_type           │         │                                     │
│  │ level                │         │                                     │
│  │ message              │         │                                     │
│  └──────────────────────┘         │                                     │
│                                   │                                     │
└───────────────────────────────────┴─────────────────────────────────────┘
```

---

## Cross-DB 참조 (Core Service MySQL ↔ PostgreSQL)

| PostgreSQL 테이블 | 컬럼 | 참조하는 MySQL 테이블 |
|------------------|------|---------------------|
| destination_connections | user_id | users.id |
| publish_sessions | studio_id | studios.id |
| publish_sessions | started_by | users.id |
| recordings | studio_id | studios.id |
| recordings | created_by | users.id |
| stream_sessions | studio_id | studios.id |
| stream_sessions | user_id | users.id |

**주의:** Cross-DB라서 FK 제약조건 없음. 애플리케이션 레벨에서 검증 필요!  
ID 타입은 Core Service의 **BIGINT** 기준을 따름.
