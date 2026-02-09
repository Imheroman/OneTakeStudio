-- ============================================
-- OneTakeStudio Database Migration
-- user_id (BIGINT) -> od_user_id (VARCHAR(36))
-- ============================================
-- 실행 방법:
-- kubectl exec -n media deploy/mysql-media -- mysql -u media_user -pmedia_password media_db < migration-user-id-to-od-user-id.sql
-- 또는 로컬에서: mysql -u media_user -pmedia_password media_db < migration-user-id-to-od-user-id.sql

USE media_db;

-- 1. stream_sessions
ALTER TABLE stream_sessions
  CHANGE COLUMN user_id od_user_id VARCHAR(36) NOT NULL COMMENT '사용자 ID (OpenVidu)';

-- 2. recording_sessions
ALTER TABLE recording_sessions
  CHANGE COLUMN user_id od_user_id VARCHAR(36) NOT NULL COMMENT '사용자 ID (OpenVidu)';

-- 3. user_media_settings
ALTER TABLE user_media_settings
  CHANGE COLUMN user_id od_user_id VARCHAR(36) NOT NULL COMMENT '사용자 ID (OpenVidu)';

-- 4. session_media_states
ALTER TABLE session_media_states
  CHANGE COLUMN user_id od_user_id VARCHAR(36) NOT NULL COMMENT '사용자 ID (OpenVidu)';

-- 5. screen_share_sessions
ALTER TABLE screen_share_sessions
  CHANGE COLUMN user_id od_user_id VARCHAR(36) NOT NULL COMMENT '사용자 ID (OpenVidu)';

-- 6. publish_sessions
ALTER TABLE publish_sessions
  CHANGE COLUMN user_id od_user_id VARCHAR(36) NOT NULL COMMENT '사용자 ID (OpenVidu)';

-- 7. chat_messages
ALTER TABLE chat_messages
  CHANGE COLUMN user_id od_user_id VARCHAR(36) NOT NULL COMMENT '사용자 ID (OpenVidu)';

-- 8. platform_tokens
ALTER TABLE platform_tokens
  CHANGE COLUMN user_id od_user_id VARCHAR(36) NOT NULL COMMENT '사용자 ID (OpenVidu)';

-- 9. markers
ALTER TABLE markers
  CHANGE COLUMN user_id od_user_id VARCHAR(36) NOT NULL COMMENT '사용자 ID (OpenVidu)';

-- 10. shorts_jobs
ALTER TABLE shorts_jobs
  CHANGE COLUMN user_id od_user_id VARCHAR(36) NOT NULL COMMENT '사용자 ID (OpenVidu)';

-- 변경 확인
SHOW COLUMNS FROM stream_sessions LIKE 'od_user_id';
SHOW COLUMNS FROM recording_sessions LIKE 'od_user_id';
SHOW COLUMNS FROM user_media_settings LIKE 'od_user_id';
SHOW COLUMNS FROM session_media_states LIKE 'od_user_id';
SHOW COLUMNS FROM screen_share_sessions LIKE 'od_user_id';
SHOW COLUMNS FROM publish_sessions LIKE 'od_user_id';
SHOW COLUMNS FROM chat_messages LIKE 'od_user_id';
SHOW COLUMNS FROM platform_tokens LIKE 'od_user_id';
SHOW COLUMNS FROM markers LIKE 'od_user_id';
SHOW COLUMNS FROM shorts_jobs LIKE 'od_user_id';
