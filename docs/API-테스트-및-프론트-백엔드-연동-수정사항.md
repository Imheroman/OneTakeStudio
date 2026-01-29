# API 테스트 및 프론트-백엔드 연동 수정사항

**작성일**: 2026-01-28
**브랜치**: be-dev

---

## 1. API 테스트 결과

### 인프라 상태: 전체 정상

| 서비스 | 포트 | 상태 |
|--------|------|------|
| Eureka Server | 8761 | OK |
| API Gateway | 60000 | OK |
| Core Service | 8080 | OK |
| Media Service | 8082 | OK |
| MySQL | 3306 | OK |
| PostgreSQL | 5432 | OK |
| Redis | 6379 | OK |
| LiveKit | 7880 | OK |
| RabbitMQ | 5672 / 15672 | OK |

### Core Service API (Gateway 경유)

| API | 메서드 | 결과 |
|-----|--------|------|
| POST /api/auth/login | 로그인 | SUCCESS |
| POST /api/auth/refresh | 토큰 갱신 | SUCCESS |
| POST /api/auth/send-verification | 이메일 인증코드 발송 | SUCCESS |
| GET /api/auth/check-email | 이메일 중복확인 | SUCCESS |
| GET /api/users/me | 내 프로필 조회 | SUCCESS |
| PUT /api/users/me | 프로필 수정 | 500 ERROR (미해결) |
| GET /api/studios | 스튜디오 목록 | SUCCESS |
| GET /api/studios/{id} | 스튜디오 상세 | SUCCESS |
| POST /api/studios | 스튜디오 생성 | SUCCESS |
| DELETE /api/studios/{id} | 스튜디오 삭제 | SUCCESS |
| GET /api/studios/{id}/members | 멤버 목록 | SUCCESS |
| GET /api/studios/{id}/scenes | 씬 목록 | SUCCESS |
| GET /api/destinations | 송출 채널 목록 | SUCCESS |
| GET /api/destinations/{id} | 채널 상세 | SUCCESS |
| GET /api/workspace/dashboard | 대시보드 | SUCCESS |
| GET /api/notifications | 알림 목록 | SUCCESS |

### Media Service API (직접 호출)

| API | 메서드 | 결과 |
|-----|--------|------|
| POST /api/v1/media/stream/join | 스트림 참가 | SUCCESS (토큰 발급 정상) |
| GET /api/v1/media/ice-servers | ICE 서버 | SUCCESS |
| GET /api/v1/media/stream/{id}/history | 세션 히스토리 | SUCCESS |
| GET /api/v1/media/record/studio/{id} | 녹화 목록 | SUCCESS |
| GET /api/v1/media/publish/status | 송출 상태 | 정상 (송출 없음 400) |
| GET /api/v1/media/screen-share/active | 화면 공유 | 정상 (활성 없음 400) |

---

## 2. 발견된 이슈 및 수정 내역

### 이슈 1: Gateway -> Media Service X-User-Id 헤더 미전달

**증상**: Gateway를 통해 Media Service API 호출 시 500 에러 발생. Media Service 직접 호출(8082)에 `X-User-Id` 헤더를 넣으면 정상 동작.

**원인**: Gateway가 JWT에서 사용자 정보를 추출해 downstream 서비스로 전달하는 필터가 없었음.

**수정 내용**:

#### (1) common/src/.../jwt/JwtUtil.java
- `generateAccessToken(userId, email, nickname, internalId)` 오버로드 추가
- JWT에 `iid` 클레임으로 내부 BIGINT ID 포함
- `getInternalId()` 메서드 추가

#### (2) core-service/src/.../auth/service/AuthService.java
- `login()`, `refreshToken()`, `processOAuthLogin()` 3곳에서 토큰 생성 시 `user.getId()` (내부 BIGINT) 전달

#### (3) api-gateway/pom.xml
- `jjwt-api`, `jjwt-impl`, `jjwt-jackson` 0.12.5 의존성 추가

#### (4) api-gateway/src/main/resources/application.yml
- `jwt.secret` 설정 추가 (Core Service와 동일한 키)

#### (5) api-gateway/src/.../filter/JwtUserIdFilter.java (신규)
- `GlobalFilter` 구현, 모든 요청에 적용
- Authorization Bearer 토큰에서 JWT 파싱 후 3가지 헤더를 downstream 서비스로 전달:
  - `X-User-Id`: 내부 BIGINT ID (Media Service용)
  - `X-User-Uuid`: UUID
  - `X-User-Email`: 이메일
- JWT 파싱 실패 시 헤더 없이 통과 (인증은 각 서비스에서 처리)

---

### 이슈 2: 프론트엔드 CORS 에러

**증상**: `Access to XMLHttpRequest at 'http://localhost:8080/api/auth/login' from origin 'http://localhost:3000' has been blocked by CORS policy`

**원인**: `frontend/.env.local`의 `NEXT_PUBLIC_API_URL`이 Core Service(8080) 직접 지정되어 있어 CORS 발생.

**수정**:
- `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8080` -> `http://localhost:60000` (Gateway)

---

### 이슈 3: 스튜디오 생성 400 에러

**증상**: 프론트에서 스튜디오 생성 시 400 Bad Request.

**원인**: 프론트엔드는 `{ title, description, transmissionType, storageLocation, platforms }` 를 보내는데, 백엔드 `CreateStudioRequest`는 `name`(필수)만 받아서 `name`이 null.

**수정 내용**:

#### (1) core-service/src/.../studio/dto/CreateStudioRequest.java
- `title`, `description`, `transmissionType`, `storageLocation`, `platforms` 필드 추가
- `getEffectiveName()` 메서드로 `name` 또는 `title` 중 유효한 값 사용

#### (2) core-service/src/.../studio/entity/Studio.java
- `description` 컬럼 추가 (JPA ddl-auto: update로 자동 생성)

#### (3) core-service/src/.../studio/service/StudioService.java
- `getEffectiveName()` 호출하여 `title`도 `name`으로 매핑

#### (4) core-service/src/.../studio/dto/StudioDetailResponse.java
- 응답에 `description` 필드 포함

---

### 이슈 4: 스튜디오 생성 후 Zod 검증 실패

**증상**: 백엔드 로그에 스튜디오 생성 성공(201)이 찍히지만, 프론트에서 `API 응답 검증 실패: Invalid input: expected object, received undefined`.

**원인**: 백엔드 응답 형식과 프론트 Zod 스키마 불일치.

| 항목 | 백엔드 실제 응답 | 프론트 기대 형식 |
|------|-----------------|-----------------|
| 래퍼 | `{ resultCode, success, message, data: {...} }` | `{ studio: {...} }` |
| ID 필드 | `studioId` (number) | `id` (string) |
| 이름 필드 | `name` | `title` |

**수정 내용**:

#### (1) frontend/src/entities/studio/model/schemas.ts
- `StudioSchema`: 백엔드 실제 필드(`studioId`, `name`, `description`, `thumbnail`, `template`, `status` 등)로 수정
- `CreateStudioResponseSchema`: `ApiResponse` 래퍼 형식(`{ resultCode, success, message, data }`)으로 수정
- `StudioDetailSchema`: 백엔드 응답에 맞게 단순화

#### (2) frontend/src/features/studio/studio-creation/ui/StudioCreation.tsx
- `response.studio.id` -> `response.data.studioId`

#### (3) frontend/src/features/studio/studio-main/ui/StudioMain.tsx
- `z` import 추가
- API 응답 파싱에 `ApiResponse` 래퍼 적용
- `studio.title` -> `studio.name`
- `studio.sources`, `studio.scenes`에 null 안전 처리(`?? []`)

---

## 3. 미해결 이슈

| 이슈 | 상태 | 비고 |
|------|------|------|
| PUT /api/users/me 500 에러 | 미해결 | Core Service 프로필 수정 내부 오류, 로그 확인 필요 |

---

## 4. 적용 방법

1. Core Service 재시작 (JWT에 `iid` 클레임 포함, Studio description 컬럼 자동 생성)
2. API Gateway 재시작 (JwtUserIdFilter 적용)
3. 프론트엔드 재시작 (.env.local 변경, 스키마 수정 반영)
4. 새로 로그인하여 `iid` 클레임이 포함된 JWT 발급 필요
