-- ============================================
-- OneTakeStudio Database Migration
-- user_id 컬럼 제거 (ddl-auto:update가 이미 od_user_id를 추가한 상태)
-- ============================================
-- 실행 방법:
-- mysql -u media_user -pmedia_password media_db < migration-drop-user-id.sql

USE media_db;

-- user_id 컬럼이 존재하면 DROP (od_user_id가 이미 있으므로 안전)
ALTER TABLE stream_sessions DROP COLUMN IF EXISTS user_id;
ALTER TABLE recording_sessions DROP COLUMN IF EXISTS user_id;
ALTER TABLE user_media_settings DROP COLUMN IF EXISTS user_id;
ALTER TABLE session_media_states DROP COLUMN IF EXISTS user_id;
ALTER TABLE screen_share_sessions DROP COLUMN IF EXISTS user_id;
ALTER TABLE publish_sessions DROP COLUMN IF EXISTS user_id;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS user_id;
ALTER TABLE platform_tokens DROP COLUMN IF EXISTS user_id;
ALTER TABLE markers DROP COLUMN IF EXISTS user_id;
ALTER TABLE shorts_jobs DROP COLUMN IF EXISTS user_id;

-- 확인
SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'media_db' AND COLUMN_NAME = 'user_id';
