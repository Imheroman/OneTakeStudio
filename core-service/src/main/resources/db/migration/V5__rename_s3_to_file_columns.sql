-- V5: S3 컬럼명을 EC2 스토리지에 맞게 변경
-- recordings 테이블
ALTER TABLE recordings CHANGE COLUMN s3_key file_path VARCHAR(500);
ALTER TABLE recordings CHANGE COLUMN s3_url file_url VARCHAR(500);

-- clips 테이블
ALTER TABLE clips CHANGE COLUMN s3_key file_path VARCHAR(500);
ALTER TABLE clips CHANGE COLUMN s3_url file_url VARCHAR(500);
