# 데이터베이스 마이그레이션 가이드

> 작성일: 2026-01-28  
> Hibernate `ddl-auto: update` 사용 시 데이터베이스 스키마 관리 방법

## 현재 설정

- **마이그레이션 도구**: Flyway/Liquibase 미사용
- **스키마 관리**: Hibernate `ddl-auto: update` 사용
- **마이그레이션 파일**: `core-service/src/main/resources/db/migration/` (수동 실행용)

## 시나리오별 해결 방법

### 시나리오 1: 데이터베이스가 완전히 비어있는 경우 (초기 설정)

**가장 간단한 방법입니다.**

1. **Docker Compose로 MySQL 시작**
   ```bash
   docker-compose up -d mysql
   ```

2. **Core Service 실행**
   - Hibernate가 엔티티를 기반으로 자동으로 테이블을 생성합니다
   - `ddl-auto: update`가 모든 테이블과 컬럼을 생성합니다

3. **확인**
   ```bash
   # MySQL 접속
   docker exec -it onetakestudio-mysql mysql -u core_user -pcore_password core_db
   
   # 테이블 확인
   SHOW TABLES;
   DESCRIBE studios;
   ```

**결과**: `title`, `host_user_id` 필드가 포함된 완전한 스키마가 생성됩니다.

---

### 시나리오 2: 데이터베이스에 기존 데이터가 있는 경우

**주의**: NOT NULL 컬럼 추가 시 기존 데이터에 기본값이 필요합니다.

#### 방법 A: 데이터베이스 완전 초기화 (개발 환경만)

**⚠️ 모든 데이터가 삭제됩니다!**

```bash
# 1. Docker Compose 중지 및 볼륨 삭제
docker-compose down -v

# 2. MySQL 재시작
docker-compose up -d mysql

# 3. Core Service 실행 (자동 스키마 생성)
# Hibernate가 엔티티 기반으로 새 테이블 생성
```

#### 방법 B: 수동으로 ALTER TABLE 실행 (데이터 보존)

**기존 데이터를 유지하면서 스키마만 업데이트**

```bash
# MySQL 접속
docker exec -it onetakestudio-mysql mysql -u core_user -pcore_password core_db
```

```sql
-- 1. title 필드 추가 (기존 데이터에 name 값을 기본값으로 설정)
ALTER TABLE studios 
ADD COLUMN title VARCHAR(100) NOT NULL DEFAULT '' 
AFTER name;

-- 2. 기존 데이터의 title을 name과 동일하게 업데이트
UPDATE studios SET title = name WHERE title = '';

-- 3. DEFAULT 제거 (이제 NOT NULL만 유지)
ALTER TABLE studios 
MODIFY COLUMN title VARCHAR(100) NOT NULL;

-- 4. host_user_id 필드 추가 (기존 데이터에 owner_id 값을 기본값으로 설정)
ALTER TABLE studios 
ADD COLUMN host_user_id BIGINT NOT NULL DEFAULT 0 
AFTER owner_id;

-- 5. 기존 데이터의 host_user_id를 owner_id와 동일하게 업데이트
UPDATE studios SET host_user_id = owner_id WHERE host_user_id = 0;

-- 6. DEFAULT 제거 및 외래키 추가
ALTER TABLE studios 
MODIFY COLUMN host_user_id BIGINT NOT NULL;

ALTER TABLE studios 
ADD CONSTRAINT fk_studios_host_user 
FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 7. 인덱스 추가
CREATE INDEX idx_host_user ON studios(host_user_id);

-- 8. 확인
DESCRIBE studios;
```

#### 방법 C: Hibernate가 자동으로 처리하도록 설정 변경 (임시)

**주의**: 기존 데이터가 있으면 실패할 수 있습니다.

```yaml
# application.yml (임시)
spring:
  jpa:
    hibernate:
      ddl-auto: update  # 이미 설정됨
```

- Hibernate가 자동으로 컬럼을 추가하려고 시도하지만, NOT NULL 컬럼 추가는 실패할 수 있습니다.
- **권장하지 않음**: 방법 B를 사용하는 것이 안전합니다.

---

### 시나리오 3: 마이그레이션 파일을 수동 실행하고 싶은 경우

`db/migration/V3__create_studio_tables.sql` 파일을 직접 실행:

```bash
# MySQL 접속
docker exec -i onetakestudio-mysql mysql -u core_user -pcore_password core_db < core-service/src/main/resources/db/migration/V3__create_studio_tables.sql
```

**주의**: 
- 이미 테이블이 존재하면 `CREATE TABLE IF NOT EXISTS`로 인해 변경사항이 반영되지 않을 수 있습니다.
- 기존 테이블을 삭제하거나 ALTER TABLE을 사용해야 합니다.

---

## 권장 워크플로우

### 개발 환경 (데이터 손실 가능)

1. **Docker Compose 재시작**
   ```bash
   docker-compose down -v  # 볼륨 삭제
   docker-compose up -d mysql
   ```

2. **Core Service 실행**
   - Hibernate가 자동으로 스키마 생성

### 운영 환경 또는 데이터 보존 필요 시

1. **수동 ALTER TABLE 실행** (방법 B 사용)
   - 기존 데이터 보존
   - 안전한 스키마 업데이트

---

## 확인 방법

### 1. 테이블 구조 확인

```bash
docker exec -it onetakestudio-mysql mysql -u core_user -pcore_password core_db -e "DESCRIBE studios;"
```

**예상 결과:**
```
+-------------+--------------+------+-----+---------+----------------+
| Field       | Type         | Null | Key | Default | Extra          |
+-------------+--------------+------+-----+---------+----------------+
| id          | bigint       | NO   | PRI | NULL    | auto_increment |
| studio_id   | char(36)     | NO   | UNI | NULL    |                |
| owner_id    | bigint       | NO   | MUL | NULL    |                |
| host_user_id| bigint       | NO   | MUL | NULL    |                |
| name        | varchar(100) | NO   |     | NULL    |                |
| title       | varchar(100) | NO   |     | NULL    |                |
| ...         | ...          | ...  | ... | ...     | ...            |
+-------------+--------------+------+-----+---------+----------------+
```

### 2. Core Service 로그 확인

Core Service 시작 시 Hibernate가 스키마를 생성/업데이트하는 로그를 확인:

```
Hibernate: create table studios (...)
```

또는

```
Hibernate: alter table studios add column title varchar(100) not null
```

---

## 문제 해결

### 문제: "Field 'title' doesn't have a default value"

**원인**: 
- 데이터베이스에 기존 데이터가 있는데, NOT NULL 컬럼을 추가하려고 할 때 기본값이 없음

**해결**:
- 방법 B (수동 ALTER TABLE) 사용
- 또는 데이터베이스 초기화 (방법 A)

### 문제: Hibernate가 컬럼을 추가하지 않음

**원인**:
- `ddl-auto: update`는 기존 컬럼을 수정하지만, NOT NULL 컬럼 추가는 실패할 수 있음

**해결**:
- 수동으로 ALTER TABLE 실행
- 또는 데이터베이스 초기화

---

## 요약

| 상황 | 권장 방법 | 명령어 |
|------|----------|--------|
| 데이터베이스 비어있음 | Docker 재시작 + Core Service 실행 | `docker-compose down -v && docker-compose up -d mysql` |
| 데이터 보존 필요 | 수동 ALTER TABLE | 방법 B 참조 |
| 개발 환경 (데이터 무관) | 데이터베이스 초기화 | `docker-compose down -v` |

**현재 상황 (데이터베이스 없음)**: 
→ **시나리오 1** 사용: Docker 재시작 후 Core Service 실행하면 자동으로 스키마가 생성됩니다!
