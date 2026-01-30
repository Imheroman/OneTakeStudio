-- Media Service 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS media_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Media Service 사용자 생성 및 권한 부여
CREATE USER IF NOT EXISTS 'media_user'@'%' IDENTIFIED BY 'media_password';
GRANT ALL PRIVILEGES ON media_db.* TO 'media_user'@'%';
FLUSH PRIVILEGES;
