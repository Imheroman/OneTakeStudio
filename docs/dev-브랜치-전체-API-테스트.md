# dev 브랜치 전체 API 테스트 기록

## 작업 일자
2026-01-28

## 개요
`be-dev` → `dev` 머지 후, dev 브랜치에서 전체 서비스를 기동하여 Gateway 경유 API 테스트를 수행했다.
스튜디오 생성 시 DB 스키마 불일치 문제를 발견하고 해결했다.

---

## 1. DB 스키마 수정

### 문제
`ddl-auto: update` 설정으로 인해 Studio 엔티티 변경 시 새 컬럼만 추가되고,
이전 버전 컬럼이 NOT NULL로 남아 있어 INSERT 시 에러 발생.

```
java.sql.SQLException: Field 'host_user_id' doesn't have a default value
```

### 원인
팀원이 Studio 엔티티를 리팩토링하면서 필드명을 변경했으나 DB 마이그레이션을 수행하지 않음.

| 이전 (be-workspace) | 이후 (be-dev) |
|---------------------|--------------|
| `host_user_id` | `owner_id` |
| `title` | `name` |
| `description` | (삭제) |
| `thumbnail_url` | `thumbnail` |
| `scheduled_at` | (삭제) |
| `started_at` | (삭제) |
| `ended_at` | (삭제) |
| `StudioStatus.PREPARING` | `StudioStatus.READY` |

### 해결
데이터 0건 확인 후, 이전 버전 컬럼 7개를 삭제하고 status enum을 통일했다.

```sql
ALTER TABLE studios
  DROP COLUMN host_user_id,
  DROP COLUMN title,
  DROP COLUMN description,
  DROP COLUMN thumbnail_url,
  DROP COLUMN scheduled_at,
  DROP COLUMN started_at,
  DROP COLUMN ended_at,
  MODIFY COLUMN status ENUM('READY','LIVE','ENDED') DEFAULT 'READY';
```

### 수정 후 studios 테이블
| Field | Type | Null | Default |
|-------|------|------|---------|
| id | bigint | NO (PK) | auto_increment |
| studio_id | varchar(36) | NO (UNI) | |
| owner_id | bigint | NO | |
| name | varchar(100) | NO | |
| template | varchar(50) | YES | |
| thumbnail | varchar(500) | YES | |
| status | enum('READY','LIVE','ENDED') | YES | READY |
| created_at | datetime(6) | NO | |
| updated_at | datetime(6) | NO | |

---

## 2. 테스트 환경

- **브랜치**: `dev`
- **서비스**: Eureka (8761) + Core Service (랜덤포트) + API Gateway (8080)
- **DB**: MySQL (Docker: onetakestudio-mysql)
- **테스트 계정**: `unimokw1@gmail.com` / `xogus123`

---

## 3. API 테스트 결과 (전체 통과)

| # | API | 메서드 | HTTP | 응답 요약 |
|---|-----|--------|------|-----------|
| 1 | `/api/auth/login` | POST | 200 | JWT 토큰 + 사용자 정보 반환 |
| 2 | `/api/workspace/{userId}/studios/recent` | GET | 200 | `{"studios":[...]}` |
| 3 | `/api/notifications` | GET | 200 | `{"notifications":[]}` (stub) |
| 4 | `/api/workspace/dashboard` | GET | 200 | recentStudios, connectedDestinationCount, totalStudioCount |
| 5 | `/api/destinations` | GET | 200 | 연동된 송출채널 목록 |
| 6 | `/api/studios` | GET | 200 | 스튜디오 목록 |
| 7 | `/api/studios` | POST | 201 | 스튜디오 생성 성공 |
| 8 | `/api/studios/{id}` | GET | 200 | 스튜디오 상세 (멤버, 씬 포함) |
| 9 | `/api/studios/{id}` | PATCH | 200 | 스튜디오 수정 성공 |
| 10 | `/api/studios/{id}` | DELETE | 200 | 스튜디오 삭제 성공 |

### 참고: 스튜디오 수정은 PATCH
- `PUT /api/studios/{id}` → 405 (지원하지 않는 메서드)
- `PATCH /api/studios/{id}` → 200 (정상)

---

## 4. 응답 예시

### 스튜디오 생성 (POST /api/studios)
```json
{
  "success": true,
  "message": "스튜디오 생성 성공",
  "data": {
    "studioId": 2,
    "name": "TestStudio2",
    "thumbnail": null,
    "template": "basic",
    "status": "ready",
    "joinUrl": "https://studio.example.com/join/425d002e-...",
    "members": null,
    "scenes": null,
    "createdAt": "2026-01-28T13:42:24.014215",
    "updatedAt": "2026-01-28T13:42:24.014215"
  }
}
```

### 최근 스튜디오 (GET /api/workspace/{userId}/studios/recent)
```json
{
  "studios": [
    { "id": 1, "title": "TestStudio", "date": "2026-01-28" }
  ]
}
```

### 대시보드 (GET /api/workspace/dashboard)
```json
{
  "success": true,
  "message": "대시보드 조회 성공",
  "data": {
    "recentStudios": [
      { "id": 1, "title": "TestStudio", "date": "2026-01-28" }
    ],
    "connectedDestinationCount": 1,
    "totalStudioCount": 1
  }
}
```
