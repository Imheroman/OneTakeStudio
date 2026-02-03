-- GUEST 역할 제거: 기존 GUEST를 MANAGER로 변환
-- 송출 서비스에서는 시청이 플랫폼에서 이루어지므로 GUEST 불필요

UPDATE studio_members SET role = 'MANAGER' WHERE role = 'GUEST';
UPDATE member_invites SET role = 'MANAGER' WHERE role = 'GUEST';
