# be-dev → dev 브랜치 머지 기록

## 작업 일자
2026-01-28

## 개요
`be-dev` 통합 브랜치의 전체 백엔드 작업을 `dev` 브랜치에 머지했다.
충돌 없이 자동 머지되었으며, 빌드 검증 후 푸시 완료.

---

## 1. 머지 대상 커밋 (be-dev → dev, 10개)

| 커밋 | 설명 |
|------|------|
| `84455e0` | docs: be-workspace → be-dev 머지 기록 문서 추가 |
| `e452fec` | Merge branch 'be-workspace' into be-dev |
| `822f385` | feat: Workspace/Notification API 연동 및 /api/v1 경로 통일 |
| `9ea7955` | docs(test): Studio API 테스트 환경 구성 |
| `cd4b284` | fix(workspace): Studio 엔티티 변경에 따른 Workspace 코드 수정 |
| `787ef29` | Merge branch 'be-studio' into be-dev |
| `43a7512` | Merge remote-tracking branch 'origin/be-dev' into be-dev |
| `198a476` | Merge remote-tracking branch 'origin/be-destination' into be-dev |
| `2666012` | feat(studio): Studio Service 구현 (스튜디오/멤버/씬 관리) |
| `65f438c` | feat(core): destination service 구현, test 완료 |

---

## 2. dev 브랜치에만 있던 커밋 (2개)

| 커밋 | 설명 |
|------|------|
| `7bd2250` | chore: 문서 파일 구조 정리 - frontend/docs 폴더 생성 |
| `32bf90f` | Update 6 files (.idea 파일 삭제) |

---

## 3. 반영된 주요 변경 사항 (92개 파일)

### 백엔드 - Studio Service (신규)
- 스튜디오 CRUD (생성/목록/상세/수정/삭제)
- 멤버 관리 (목록/초대/역할변경/강퇴)
- 씬 관리 (목록/생성/수정/삭제)
- Studio 엔티티 변경: `hostUserId` → `ownerId`, `title` → `name`
- DB 마이그레이션 V3 추가

### 백엔드 - Workspace API 연동
- WorkspaceController 경로: `/api/workspace/{userId}/studios/recent`, `/api/workspace/dashboard`
- ApiResponse 래퍼 제거 (최근 스튜디오), `{ studios: [...] }` 형태 직접 반환
- RecentStudioListResponse 래퍼 DTO 추가

### 백엔드 - Notification Stub API (신규)
- `GET /api/notifications` → 빈 목록 `{ notifications: [] }` 반환

### 백엔드 - Destination Service 리팩토링
- 예외 클래스 분리 (DestinationNotFoundException, DestinationAlreadyExistsException)
- GlobalExceptionHandler 추가

### 인프라 - API Gateway
- Core Service 라우트 확장: `/api/workspace/**`, `/api/notifications/**`, `/api/destinations/**`, `/api/dashboard` 추가
- CORS `allowedOriginPatterns("*")` 적용

### 프론트엔드 - API 경로 통일
- 전체 `/api/v1/` → `/api/`로 변경 (12개 컴포넌트 + mock 핸들러)

### 문서
- Studio Service 문서 (MR, 상세 설명)
- API 테스트 HTML 페이지
- troubleshooting 폴더 (12개 문서)
- Workspace API 연동 기록
- 브랜치 머지 기록

---

## 4. 충돌 여부
충돌 없음 (자동 머지 성공)

## 5. 빌드 검증

| 모듈 | 결과 |
|------|------|
| core-service | BUILD SUCCESS |
| api-gateway | BUILD SUCCESS |

## 6. 머지 커밋 정보
- **커밋**: `12b3ed5`
- **메시지**: `Merge remote-tracking branch 'origin/be-dev' into dev`
- **푸시**: `origin/dev`에 정상 반영
