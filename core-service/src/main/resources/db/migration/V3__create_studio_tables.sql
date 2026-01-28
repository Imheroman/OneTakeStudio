-- studios 테이블
CREATE TABLE IF NOT EXISTS studios (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    studio_id CHAR(36) UNIQUE NOT NULL COMMENT '외부 노출 UUID',
    owner_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    thumbnail VARCHAR(500),
    template VARCHAR(50),
    status VARCHAR(20) DEFAULT 'READY' COMMENT 'READY/LIVE/ENDED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_studio_id (studio_id),
    INDEX idx_owner (owner_id),
    INDEX idx_status (status)
);

-- studio_members 테이블
CREATE TABLE IF NOT EXISTS studio_members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    studio_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL COMMENT 'HOST/MANAGER/GUEST',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_studio_user (studio_id, user_id),
    INDEX idx_studio (studio_id),
    INDEX idx_user (user_id)
);

-- member_invites 테이블
CREATE TABLE IF NOT EXISTS member_invites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invite_id VARCHAR(20) UNIQUE NOT NULL COMMENT 'inv-abc123 형식',
    studio_id BIGINT NOT NULL,
    inviter_id BIGINT NOT NULL,
    invitee_email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_studio (studio_id),
    INDEX idx_status (status)
);

-- scenes 테이블
CREATE TABLE IF NOT EXISTS scenes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    scene_id CHAR(36) UNIQUE NOT NULL,
    studio_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    thumbnail VARCHAR(500),
    is_active BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    layout JSON COMMENT '{"type":"pip","elements":[...]}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
    INDEX idx_studio (studio_id),
    INDEX idx_active (is_active)
);
