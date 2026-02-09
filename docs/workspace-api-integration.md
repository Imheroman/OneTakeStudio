# Workspace 프론트엔드-백엔드 API 연동 작업 기록

## 작업 일자
2026-01-28

## 개요
프론트엔드가 기대하는 API 형식에 맞춰 백엔드 API를 수정하고, 누락된 Notification stub API를 추가했다.
이후 전체 프론트엔드/백엔드에서 `/api/v1/` 경로를 `/api/`로 통일했다.

---

## 1. WorkspaceController 경로 및 응답 형식 수정

### 변경 사항
- `@RequestMapping("/api")` -> `@RequestMapping("/api/workspace")`
- `GET /studios/recent` -> `GET /{userId}/studios/recent` (PathVariable 추가)
- 응답에서 `ApiResponse` 래퍼 제거, `{ studios: [...] }` 형태로 직접 반환

### 변경 파일
| 파일 | 변경 내용 |
|------|----------|
| `core-service/.../workspace/controller/WorkspaceController.java` | RequestMapping 변경, PathVariable userId 추가, 반환타입 변경 |
| `core-service/.../workspace/service/WorkspaceService.java` | 반환타입 `RecentStudioListResponse`로 변경, `StudioMemberRepository` 의존성 제거 |
| `core-service/.../workspace/dto/RecentStudioResponse.java` | 필드 변경: `id`(Long), `title`(String), `date`(String, yyyy-MM-dd) |
| `core-service/.../workspace/dto/RecentStudioListResponse.java` | **신규 생성** - `{ studios: [...] }` 래퍼 DTO |

### 프론트엔드 기대 형식
```
GET /api/workspace/{userId}/studios/recent
```
```json
{
  "studios": [
    { "id": 1, "title": "스튜디오 제목", "date": "2026-01-28" }
  ]
}
```

### Dashboard 경로
기존 `GET /api/dashboard` -> `GET /api/workspace/dashboard`로 자동 변경됨 (RequestMapping 변경에 따라)

---

## 2. Notification Stub API 추가

프론트엔드 레이아웃(`layout.tsx`, `top-nav`)에서 알림 목록을 호출하므로, 빈 목록을 반환하는 stub API를 추가했다.

### 신규 파일
| 파일 | 설명 |
|------|------|
| `core-service/.../notification/controller/NotificationController.java` | `GET /api/notifications` -> 빈 목록 반환 |
| `core-service/.../notification/dto/NotificationResponse.java` | 알림 단건 DTO (id, type, title, message, time, createdAt, read) |
| `core-service/.../notification/dto/NotificationListResponse.java` | `{ notifications: [...] }` 래퍼 DTO |

### 응답 형식
```
GET /api/notifications
```
```json
{
  "notifications": []
}
```

---

## 3. API Gateway 라우트 추가

### 변경 파일
`api-gateway/src/main/resources/application.yml`

### 변경 내용
Core Service 라우트에 신규 경로 추가:

**변경 전:**
```yaml
- Path=/api/auth/**, /api/users/**, /api/studios/**
```

**변경 후:**
```yaml
- Path=/api/auth/**, /api/users/**, /api/studios/**, /api/workspace/**, /api/notifications/**, /api/destinations/**, /api/dashboard
```

---

## 4. `/api/v1/` 경로 통일 (`/api/`로 변경)

프론트엔드와 백엔드 전체에서 `/api/v1/` prefix를 `/api/`로 통일했다.
Media Service(`/api/v1/media/**`)는 별도 서비스이므로 그대로 유지.

### 백엔드 변경 (3개 파일)
| 파일 | 변경 |
|------|------|
| `WorkspaceController.java` | `/api/v1/workspace` -> `/api/workspace` |
| `NotificationController.java` | `/api/v1/notifications` -> `/api/notifications` |
| `api-gateway/application.yml` | 라우트 경로에서 v1 제거 |

### 프론트엔드 변경 (12개 파일)
| 파일 | 변경된 경로 |
|------|------------|
| `WorkspaceHome.tsx` | `/api/workspace/{userId}/studios/recent` |
| `top-nav/index.tsx` | `/api/notifications` |
| `(main)/layout.tsx` | `/api/notifications` |
| `SignupForm.tsx` | `/api/auth/signup` |
| `FavoriteManagement.tsx` | `/api/favorites`, `/api/favorites/{id}` |
| `StudioMain.tsx` | `/api/studios/{studioId}` |
| `StudioCreation.tsx` | `/api/studios` |
| `ChannelManagement.tsx` | `/api/channels`, `/api/channels/connect`, `/api/channels/{id}` |
| `VideoLibrary.tsx` | `/api/library/videos` |
| `storage/page.tsx` | `/api/storage`, `/api/storage/files` |
| `mypage/page.tsx` | `/api/users/me`, `/api/users/password` (주석) |
| `channels/oauth/callback/page.tsx` | `/api/channels/oauth/callback` |
| `InviteMemberDialog.tsx` | `/api/favorites/search` |
| `mock/handlers.ts` | mock 핸들러 전체 (16곳) |

---

## 5. API 테스트 결과 (Gateway 경유)

| API | 경로 | HTTP | 결과 |
|-----|------|------|------|
| 로그인 | `POST /api/auth/login` | 200 | 성공 |
| 최근 스튜디오 | `GET /api/workspace/{userId}/studios/recent` | 200 | `{"studios":[]}` |
| 알림 | `GET /api/notifications` | 200 | `{"notifications":[]}` |
| 대시보드 | `GET /api/workspace/dashboard` | 200 | `{"success":true,"data":{...}}` |
| 송출채널 목록 | `GET /api/destinations` | 200 | `{"success":true,"data":[...]}` |
| 송출채널 생성 (필수값 누락) | `POST /api/destinations` | 400 | validation 정상 동작 |

---

## 6. 현재 프론트엔드-백엔드 연동 현황

### 연동 완료
| 프론트엔드 경로 | 백엔드 상태 |
|----------------|-----------|
| `POST /api/auth/login` | 동작 중 |
| `POST /api/auth/oauth/{provider}/callback` | 동작 중 |
| `GET /api/workspace/{userId}/studios/recent` | 이번 작업으로 연동 |
| `GET /api/notifications` | 이번 작업으로 추가 (stub) |
| `GET /api/destinations` | 기존 구현 (CRUD 전체) |

### 미구현 (백엔드 없음)
| 프론트엔드 경로 | 메서드 | 비고 |
|----------------|--------|------|
| `/api/auth/signup` | POST | 경로 불일치 (백엔드: `/api/auth/register`) |
| `/api/studios` | POST | 스튜디오 생성 |
| `/api/studios/{studioId}` | GET | 스튜디오 상세 |
| `/api/channels` | GET/POST/DELETE | 채널 관리 (destinations와 별개) |
| `/api/channels/oauth/callback` | GET | 채널 OAuth 콜백 |
| `/api/favorites` | GET/POST/DELETE | 즐겨찾기 CRUD |
| `/api/favorites/search` | GET | 유저 검색 |
| `/api/library/videos` | GET | 비디오 라이브러리 |
| `/api/storage` | GET | 스토리지 |
| `/api/storage/files` | GET | 스토리지 파일 |
