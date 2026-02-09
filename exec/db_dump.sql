-- ========================================================
-- OneTakeStudio Database Dump
-- Generated: 2026-02-08
-- MySQL 8.0 | Character Set: utf8mb4
-- ========================================================

-- -----------------------------------------
-- 1) 데이터베이스 및 사용자 생성
-- -----------------------------------------

CREATE DATABASE IF NOT EXISTS core_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS media_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'user_core'@'%' IDENTIFIED BY 'core_password';
GRANT ALL PRIVILEGES ON core_db.* TO 'user_core'@'%';

CREATE USER IF NOT EXISTS 'user_media'@'%' IDENTIFIED BY 'media_password';
GRANT ALL PRIVILEGES ON media_db.* TO 'user_media'@'%';

FLUSH PRIVILEGES;


-- =========================================================
-- core_db
-- =========================================================
USE core_db;

-- -----------------------------------------
-- users
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         CHAR(36)      NOT NULL UNIQUE,
    email           VARCHAR(100)  NOT NULL UNIQUE,
    email_verified  BOOLEAN       NOT NULL DEFAULT FALSE,
    password        VARCHAR(255),
    provider        VARCHAR(20),
    provider_id     VARCHAR(100),
    nickname        VARCHAR(20)   NOT NULL,
    profile_image_url VARCHAR(2048),
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- email_verifications
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS email_verifications (
    verification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(100) NOT NULL,
    code            VARCHAR(10)  NOT NULL,
    verified        BOOLEAN      NOT NULL DEFAULT FALSE,
    expires_at      DATETIME     NOT NULL,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- password_reset_tokens
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    token      VARCHAR(100) NOT NULL UNIQUE,
    user_id    BIGINT       NOT NULL,
    used       BOOLEAN      NOT NULL DEFAULT FALSE,
    expires_at DATETIME     NOT NULL,
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- studios
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS studios (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    studio_id         CHAR(36)     NOT NULL UNIQUE,
    owner_id          BIGINT       NOT NULL,
    host_user_id      BIGINT       NOT NULL,
    name              VARCHAR(100) NOT NULL,
    title             VARCHAR(100) NOT NULL,
    description       VARCHAR(500),
    thumbnail         VARCHAR(500),
    template          VARCHAR(50),
    note              TEXT,
    status            VARCHAR(20)  DEFAULT 'READY',
    recording_storage VARCHAR(20)  DEFAULT 'LOCAL',
    created_at        DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_studio_owner FOREIGN KEY (owner_id)     REFERENCES users(id),
    CONSTRAINT fk_studio_host  FOREIGN KEY (host_user_id) REFERENCES users(id),
    INDEX idx_studio_id   (studio_id),
    INDEX idx_owner        (owner_id),
    INDEX idx_host_user    (host_user_id),
    INDEX idx_status       (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- studio_members
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS studio_members (
    id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    studio_id BIGINT      NOT NULL,
    user_id   BIGINT      NOT NULL,
    role      VARCHAR(20) NOT NULL,
    joined_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sm_studio FOREIGN KEY (studio_id) REFERENCES studios(id),
    CONSTRAINT fk_sm_user   FOREIGN KEY (user_id)   REFERENCES users(id),
    UNIQUE KEY uk_studio_user (studio_id, user_id),
    INDEX idx_studio (studio_id),
    INDEX idx_user   (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- member_invites
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS member_invites (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    invite_id      VARCHAR(20)  NOT NULL UNIQUE,
    studio_id      BIGINT       NOT NULL,
    inviter_id     BIGINT       NOT NULL,
    invitee_email  VARCHAR(255) NOT NULL,
    role           VARCHAR(20)  NOT NULL,
    status         VARCHAR(20)  DEFAULT 'PENDING',
    expires_at     DATETIME     NOT NULL,
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mi_studio  FOREIGN KEY (studio_id)  REFERENCES studios(id),
    CONSTRAINT fk_mi_inviter FOREIGN KEY (inviter_id)  REFERENCES users(id),
    INDEX idx_mi_studio (studio_id),
    INDEX idx_mi_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- scenes
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS scenes (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    scene_id   CHAR(36)    NOT NULL UNIQUE,
    studio_id  BIGINT      NOT NULL,
    name       VARCHAR(50) NOT NULL,
    thumbnail  VARCHAR(500),
    is_active  BOOLEAN     DEFAULT FALSE,
    sort_order INT         DEFAULT 0,
    layout     JSON,
    created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_scene_studio FOREIGN KEY (studio_id) REFERENCES studios(id),
    INDEX idx_sc_studio (studio_id),
    INDEX idx_sc_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- studio_assets
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS studio_assets (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    asset_id   CHAR(36)     NOT NULL UNIQUE,
    studio_id  BIGINT       NOT NULL,
    type       VARCHAR(20)  NOT NULL,
    name       VARCHAR(100) NOT NULL,
    file_url   VARCHAR(500),
    file_size  BIGINT,
    sort_order INT          DEFAULT 0,
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- studio_banners
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS studio_banners (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    banner_id     CHAR(36)     NOT NULL UNIQUE,
    studio_id     BIGINT       NOT NULL,
    text          VARCHAR(500) NOT NULL,
    timer_seconds INT,
    is_ticker     BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order    INT          DEFAULT 0,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- recordings (라이브러리)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS recordings (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    recording_id        CHAR(36)     NOT NULL UNIQUE,
    studio_id           BIGINT,
    user_id             VARCHAR(36)  NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         VARCHAR(1000),
    thumbnail_url       VARCHAR(500),
    file_name           VARCHAR(255),
    file_path           VARCHAR(500),
    file_url            VARCHAR(500),
    file_size           BIGINT,
    duration_seconds    INT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PROCESSING',
    media_recording_id  BIGINT,
    error_message       VARCHAR(500),
    created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- clips
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS clips (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    clip_id          CHAR(36)     NOT NULL UNIQUE,
    recording_id     BIGINT       NOT NULL,
    user_id          VARCHAR(36)  NOT NULL,
    title            VARCHAR(200) NOT NULL,
    description      VARCHAR(1000),
    thumbnail_url    VARCHAR(500),
    file_path        VARCHAR(500),
    file_url         VARCHAR(500),
    file_size        BIGINT,
    duration_seconds INT,
    start_time       INT,
    end_time         INT,
    status           VARCHAR(20)  NOT NULL DEFAULT 'PROCESSING',
    source_type      VARCHAR(20)  NOT NULL DEFAULT 'MANUAL',
    ai_job_id        VARCHAR(36),
    subtitle_url     VARCHAR(500),
    error_message    VARCHAR(500),
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- connected_destinations
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS connected_destinations (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    destination_id   CHAR(36)     NOT NULL UNIQUE,
    user_id          BIGINT       NOT NULL,
    platform         VARCHAR(50)  NOT NULL,
    channel_id       VARCHAR(255) NOT NULL,
    channel_name     VARCHAR(255),
    access_token     TEXT,
    refresh_token    TEXT,
    token_expires_at DATETIME,
    rtmp_url         VARCHAR(500),
    stream_key       VARCHAR(500),
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- favorites
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    favorite_id CHAR(36) NOT NULL UNIQUE,
    owner_id    BIGINT   NOT NULL,
    target_id   BIGINT   NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fav_owner  FOREIGN KEY (owner_id)  REFERENCES users(id),
    CONSTRAINT fk_fav_target FOREIGN KEY (target_id) REFERENCES users(id),
    UNIQUE KEY uk_owner_target (owner_id, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- notifications
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    notification_id CHAR(36)     NOT NULL UNIQUE,
    user_id         BIGINT       NOT NULL,
    type            VARCHAR(30)  NOT NULL,
    title           VARCHAR(100) NOT NULL,
    message         VARCHAR(500) NOT NULL,
    reference_id    VARCHAR(36),
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- shorts_jobs (AI 쇼츠)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS shorts_jobs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id          CHAR(36)    NOT NULL UNIQUE,
    user_id         BIGINT      NOT NULL,
    recording_id    VARCHAR(36) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_count     INT         DEFAULT 3,
    completed_count INT         DEFAULT 0,
    need_subtitles  BOOLEAN     DEFAULT TRUE,
    subtitle_lang   VARCHAR(10) DEFAULT 'ko',
    error_message   VARCHAR(500),
    created_at      DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- shorts_results
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS shorts_results (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    result_id           CHAR(36)    NOT NULL UNIQUE,
    job_id              BIGINT      NOT NULL,
    video_id            VARCHAR(50),
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    output_path         VARCHAR(500),
    thumbnail_path      VARCHAR(500),
    duration_sec        DOUBLE,
    resolution          VARCHAR(20),
    has_subtitles       BOOLEAN,
    highlight_start_sec DOUBLE,
    highlight_end_sec   DOUBLE,
    highlight_reason    VARCHAR(500),
    titles              TEXT,
    processing_time_sec DOUBLE,
    current_step        INT,
    total_steps         INT,
    current_step_key    VARCHAR(50),
    file_size           BIGINT,
    error_message       VARCHAR(500),
    saved               BOOLEAN     DEFAULT FALSE,
    created_at          DATETIME    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sr_job FOREIGN KEY (job_id) REFERENCES shorts_jobs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =========================================================
-- media_db
-- =========================================================
USE media_db;

-- -----------------------------------------
-- stream_sessions
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS stream_sessions (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id             CHAR(36)     NOT NULL UNIQUE,
    studio_id              VARCHAR(255) NOT NULL,
    od_user_id             VARCHAR(36)  NOT NULL,
    user_id                VARCHAR(36),
    room_name              VARCHAR(255) NOT NULL UNIQUE,
    participant_identity   VARCHAR(255) NOT NULL,
    status                 VARCHAR(20),
    started_at             DATETIME,
    ended_at               DATETIME,
    metadata               TEXT,
    created_at             DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- recording_sessions
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS recording_sessions (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    recording_id           CHAR(36)     NOT NULL UNIQUE,
    studio_id              VARCHAR(255),
    od_user_id             VARCHAR(36)  NOT NULL,
    user_id                VARCHAR(36),
    stream_session_id      BIGINT,
    egress_id              VARCHAR(255),
    status                 VARCHAR(20)  NOT NULL,
    file_name              VARCHAR(255),
    file_path              VARCHAR(500),
    file_url               VARCHAR(500),
    file_size              BIGINT,
    duration_seconds       BIGINT,
    started_at             DATETIME,
    ended_at               DATETIME,
    error_message          VARCHAR(500),
    external_upload_status VARCHAR(20),
    external_file_url      VARCHAR(500),
    external_uploaded_at   DATETIME,
    created_at             DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- publish_sessions
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS publish_sessions (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    publish_session_id  CHAR(36)     NOT NULL UNIQUE,
    studio_id           VARCHAR(255) NOT NULL,
    od_user_id          VARCHAR(36)  NOT NULL,
    user_id             VARCHAR(36),
    stream_session_id   BIGINT,
    egress_id           VARCHAR(255),
    status              VARCHAR(20)  NOT NULL,
    destination_ids     TEXT,
    rtmp_urls           TEXT,
    started_at          DATETIME,
    ended_at            DATETIME,
    error_message       VARCHAR(500),
    created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- chat_messages
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id          CHAR(36)     NOT NULL UNIQUE,
    studio_id           VARCHAR(255) NOT NULL,
    platform            VARCHAR(20)  NOT NULL,
    message_type        VARCHAR(20)  NOT NULL DEFAULT 'CHAT',
    od_user_id          VARCHAR(36),
    user_id             VARCHAR(36),
    sender_name         VARCHAR(100) NOT NULL,
    sender_profile_url  VARCHAR(500),
    content             TEXT         NOT NULL,
    external_message_id VARCHAR(255),
    donation_amount     INT,
    donation_currency   VARCHAR(10),
    is_highlighted      BOOLEAN      DEFAULT FALSE,
    is_deleted          BOOLEAN      DEFAULT FALSE,
    created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cm_studio          (studio_id),
    INDEX idx_cm_studio_created  (studio_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- platform_tokens
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS platform_tokens (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    od_user_id    VARCHAR(36)   NOT NULL,
    user_id       VARCHAR(36),
    studio_id     VARCHAR(255),
    platform      VARCHAR(20)   NOT NULL,
    access_token  VARCHAR(2048),
    refresh_token VARCHAR(2048),
    expires_at    DATETIME,
    live_chat_id  VARCHAR(255),
    broadcast_id  VARCHAR(255),
    channel_id    VARCHAR(255),
    created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_platform (od_user_id, platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- comment_stats
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS comment_stats (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    recording_id     BIGINT       NOT NULL,
    studio_id        VARCHAR(255) NOT NULL,
    counts_json      JSON,
    duration_minutes INT,
    total_count      INT,
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- markers
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS markers (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    marker_id        CHAR(36)     NOT NULL UNIQUE,
    studio_id        VARCHAR(255) NOT NULL,
    recording_id     VARCHAR(36),
    od_user_id       VARCHAR(36),
    user_id          VARCHAR(36),
    timestamp_sec    DOUBLE       NOT NULL,
    source           VARCHAR(20)  NOT NULL DEFAULT 'MANUAL',
    label            VARCHAR(100),
    chat_spike_ratio DOUBLE,
    used_for_shorts  BOOLEAN      DEFAULT FALSE,
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- user_media_settings
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS user_media_settings (
    id                            BIGINT AUTO_INCREMENT PRIMARY KEY,
    settings_id                   CHAR(36)    NOT NULL UNIQUE,
    od_user_id                    VARCHAR(36) NOT NULL UNIQUE,
    user_id                       VARCHAR(36),
    default_video_device_id       VARCHAR(255),
    video_quality                 VARCHAR(20) DEFAULT 'HIGH',
    default_audio_input_device_id VARCHAR(255),
    default_audio_output_device_id VARCHAR(255),
    audio_quality                 VARCHAR(20) DEFAULT 'HIGH',
    noise_cancellation_enabled    BOOLEAN     DEFAULT TRUE,
    echo_cancellation_enabled     BOOLEAN     DEFAULT TRUE,
    default_volume_level          INT         DEFAULT 80,
    created_at                    DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at                    DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- session_media_states
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS session_media_states (
    id                             BIGINT AUTO_INCREMENT PRIMARY KEY,
    state_id                       CHAR(36)     NOT NULL UNIQUE,
    stream_session_id              BIGINT,
    od_user_id                     VARCHAR(36)  NOT NULL,
    user_id                        VARCHAR(36),
    studio_id                      VARCHAR(255) NOT NULL,
    video_enabled                  BOOLEAN      DEFAULT TRUE,
    audio_enabled                  BOOLEAN      DEFAULT TRUE,
    current_video_device_id        VARCHAR(255),
    current_audio_input_device_id  VARCHAR(255),
    current_audio_output_device_id VARCHAR(255),
    current_volume_level           INT          DEFAULT 80,
    is_muted                       BOOLEAN      DEFAULT FALSE,
    is_active                      BOOLEAN      DEFAULT TRUE,
    created_at                     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at                     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_studio_user_active (studio_id, od_user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- screen_share_sessions
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS screen_share_sessions (
    id                       BIGINT AUTO_INCREMENT PRIMARY KEY,
    screen_share_session_id  CHAR(36)     NOT NULL UNIQUE,
    studio_id                VARCHAR(255) NOT NULL,
    od_user_id               VARCHAR(36)  NOT NULL,
    user_id                  VARCHAR(36),
    stream_session_id        BIGINT,
    share_id                 VARCHAR(255) UNIQUE,
    status                   VARCHAR(20)  NOT NULL,
    source_type              VARCHAR(20),
    track_id                 VARCHAR(255),
    started_at               DATETIME,
    stopped_at               DATETIME,
    created_at               DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- shorts_jobs (media-service)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS shorts_jobs (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id              VARCHAR(255) NOT NULL UNIQUE,
    recording_id        BIGINT       NOT NULL,
    studio_id           VARCHAR(255) NOT NULL,
    od_user_id          VARCHAR(36)  NOT NULL,
    user_id             VARCHAR(36),
    status              VARCHAR(20)  NOT NULL,
    video_path          VARCHAR(500),
    need_subtitles      BOOLEAN      DEFAULT TRUE,
    subtitle_lang       VARCHAR(10)  DEFAULT 'ko',
    output_path         VARCHAR(500),
    output_url          VARCHAR(500),
    duration_sec        DOUBLE,
    highlight_start_sec DOUBLE,
    highlight_end_sec   DOUBLE,
    highlight_reason    TEXT,
    titles_json         JSON,
    error_message       TEXT,
    created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    completed_at        DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- notifications (media-service)
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    od_user_id  VARCHAR(36)  NOT NULL,
    type        VARCHAR(30)  NOT NULL,
    title       VARCHAR(100) NOT NULL,
    message     TEXT         NOT NULL,
    resource_id VARCHAR(255),
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------
-- viewer_metrics
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS viewer_metrics (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    metrics_id      CHAR(36)     NOT NULL UNIQUE,
    studio_id       VARCHAR(255) NOT NULL,
    platform        VARCHAR(20)  NOT NULL,
    current_viewers BIGINT       NOT NULL,
    peak_viewers    BIGINT       NOT NULL,
    recorded_at     DATETIME     NOT NULL,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vm_studio_platform (studio_id, platform),
    INDEX idx_vm_studio_recorded (studio_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
