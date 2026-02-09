# be-workspace → be-dev 브랜치 머지 기록

## 작업 일자
2026-01-28

## 개요
`be-workspace` 브랜치의 Workspace/Notification API 연동 작업을 `be-dev` 통합 브랜치에 머지했다.
`be-dev`에는 다른 팀원이 작업한 Studio Service(스튜디오/멤버/씬 관리)가 이미 올라가 있었으므로,
Studio 엔티티 변경 사항을 반영하여 충돌을 해결했다.

---

## 1. 브랜치 상태

### be-workspace (우리 브랜치)
- WorkspaceController 경로 변경 (`/api/workspace`)
- RecentStudioListResponse 래퍼 DTO 추가
- Notification stub API 추가
- API Gateway 라우트 추가
- Frontend `/api/v1/` → `/api/` 경로 통일

### be-dev (팀 통합 브랜치, 7개 신규 커밋)
- Studio Service 구현 (스튜디오/멤버/씬 CRUD)
- Studio 엔티티 변경 (`hostUserId` → `ownerId`, `title` → `name`)
- StudioRepository 메서드 변경 (`findByHostUserIdOrderByCreatedAtDesc` → `findByOwnerId`)
- Destination Service 리팩토링
- GlobalExceptionHandler 추가
- DB 마이그레이션 V3 추가

---

## 2. 충돌 파일 및 해결 방법 (4개)

### 2-1. `api-gateway/src/main/resources/application.yml`

| 항목 | be-dev | be-workspace | 해결 |
|------|--------|-------------|------|
| YAML 구조 | `server.webflux.routes` | `routes` (최상위) | be-dev 구조 채택 (`server.webflux`) |
| Core Service 라우트 | `/api/auth/**`, `/api/users/**`, `/api/studios/**` | + `/api/workspace/**`, `/api/notifications/**`, `/api/destinations/**`, `/api/dashboard` | 라우트 합침 |

**최종:**
```yaml
predicates:
  - Path=/api/auth/**, /api/users/**, /api/studios/**, /api/workspace/**, /api/notifications/**, /api/destinations/**, /api/dashboard
```

### 2-2. `SecurityConfig.java`

| 항목 | be-dev | be-workspace | 해결 |
|------|--------|-------------|------|
| CORS allowedOrigins | `allowedOriginPatterns(List.of("*"))` | `allowedOrigins(List.of("localhost:3000", ...))` | be-dev 채택 (개발 환경 범용성) |

### 2-3. `RecentStudioResponse.java`

| 항목 | be-dev | be-workspace | 해결 |
|------|--------|-------------|------|
| 필드 | `studioId`, `name`, `status`, `thumbnail`, `createdAt`, `memberCount` | `id`, `title`, `date` | be-workspace 필드 채택 (프론트엔드 호환) |
| `from()` 메서드 | `from(Studio, long memberCount)` → `studio.getName()` | `from(Studio)` → `studio.getTitle()` | `from(Studio)` + `studio.getName()` → `title` 매핑 |

**핵심:** be-dev의 Studio 엔티티가 `title` → `name`으로 변경되었으므로, `studio.getName()`을 `title` 필드에 매핑했다.

```java
public static RecentStudioResponse from(Studio studio) {
    return RecentStudioResponse.builder()
            .id(studio.getId())
            .title(studio.getName())    // be-dev Studio.name → 프론트엔드 title
            .date(studio.getCreatedAt().format(DATE_FORMAT))
            .build();
}
```

### 2-4. `WorkspaceService.java`

| 항목 | be-dev | be-workspace | 해결 |
|------|--------|-------------|------|
| Repository 메서드 | `studioRepository.findByOwnerId()` | `studioRepository.findByHostUserIdOrderByCreatedAtDesc()` | be-dev 채택 (`findByOwnerId`) |
| `StudioMemberRepository` | 사용 (memberCount 계산) | 제거 | 제거 유지 (프론트엔드에서 불필요) |
| 반환 타입 | `List<RecentStudioResponse>` | `RecentStudioListResponse` | be-workspace 채택 (프론트엔드 호환) |
| map 로직 | `studio -> { memberCount 계산; from(studio, memberCount) }` | `RecentStudioResponse::from` | be-workspace 채택 (메서드 레퍼런스) |

---

## 3. 자동 머지된 파일 (충돌 없음)

| 파일 | 설명 |
|------|------|
| `WorkspaceController.java` | `/api/workspace` 경로 + `RecentStudioListResponse` 반환 |
| `RecentStudioListResponse.java` | 신규 래퍼 DTO |
| `NotificationController.java` | 신규 stub API |
| `NotificationResponse.java` | 신규 DTO |
| `NotificationListResponse.java` | 신규 래퍼 DTO |
| `frontend/*` | 전체 프론트엔드 코드 복원 (be-dev에서 삭제됨) |
| `docs/workspace-api-integration.md` | API 연동 문서 |

---

## 4. 빌드 검증

| 모듈 | 결과 |
|------|------|
| core-service | BUILD SUCCESS |
| api-gateway | BUILD SUCCESS |

---

## 5. 머지 커밋 정보

- **커밋**: `e452fec`
- **메시지**: `Merge branch 'be-workspace' into be-dev`
- **푸시**: `origin/be-dev`에 정상 반영
