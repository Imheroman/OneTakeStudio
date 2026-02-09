# FSD(Feature-Sliced Design) 구조 점검

## 레이어 및 의존 방향

- **app** → pages, widgets, features, entities, shared
- **widgets** → features, entities, shared
- **features** → entities, shared
- **entities** → shared
- **shared** → (다른 레이어 의존 금지)

규칙: **상위 레이어만 하위 레이어를 import**. shared는 최하위이므로 features/entities/widgets/app/stores를 import하면 안 됨. (stores는 app 레이어 또는 전역으로 간주)

---

## 현재 위반·주의 사항

### 1. shared → stores — **수정 완료**

- **client.ts**: 401 응답 인터셉터 제거. app 레이어 `ApiAuthProvider`에서 요청·응답 인터셉터 모두 등록.
- **AuthProvider**: `shared/providers` → `app/providers/AuthProvider.tsx`로 이동. app에서 stores 사용으로 FSD 준수.

### 2. shared → entities (API 레이어) — **Phase 1·2 완료**

| 파일 | 상태 |
|------|------|
| `shared/api/workspace.ts` | 로컬 스키마 사용, entities 미참조 |
| `shared/api/users.ts` | dto/user |
| `shared/api/library.ts` | dto/library |
| `shared/api/studio-members.ts` | dto/studio |
| `shared/api/studio-chat.ts` | dto/chat |
| `shared/api/studio-recording.ts` | dto/recording |
| `shared/api/studio-stream.ts` | dto/stream |
| `shared/api/studio-publish.ts` | dto/publish |

**결과:** shared/api에서 entities 참조 없음. API 타입·스키마는 `shared/api/dto/*`에 두고, entities는 필요 시 shared DTO를 re-export.

### 3. entities → shared

- `entities/favorite/model/schemas.ts`, `entities/favorite/model/index.ts`, `entities/channel/model/index.ts`  
  → `@/shared/api/schemas` (DeleteResponseSchema)

**의존 방향:** entities → shared 는 **허용**. 위반 아님.

---

## 권장 사항

1. **신규 shared/api 모듈**  
   - 가능하면 해당 API 응답용 스키마·타입을 shared 내부에 두고 entities 참조 지양. (예: workspace.ts의 RecentStudioItem)
2. **점진적 정리**  
   - shared/api가 entities를 참조하는 파일은 필요 시 스키마를 shared로 복사하거나 shared/api용 DTO 레이어를 도입해 제거 검토.
3. **widgets/features**  
   - 페이지·위젯은 이미 features, entities, shared만 참조. app이 widgets를 쓰는 구조 유지.

---

## 역방향 의존 점검 (검증 완료)

- **shared** → app/widgets/features/entities/stores import 없음. (shared 내부는 @/shared/lib, @/shared/ui, @/shared/api 등만 사용)
- **entities** → app/widgets/features import 없음. (entities → shared 허용)
- **features** → widgets import 없음.
- **widgets** → app import 없음. (widgets → features/entities/stores 사용은 허용)
- app → app (providers 등)만 사용. 위반 없음.

### 최근 검증 (FSD 위반 검증)

- `shared/**`: `@/shared/*`만 import. app/widgets/features/entities/stores 미사용.
- `entities/**`: `@/shared/*`(api/dto, schemas)만 상위 레이어 참조. 위반 없음.
- `features/**`: entities, shared, stores만 사용. widgets 미참조.
- `widgets/**`: features, entities, shared, stores 사용. app 미참조.
- **결론**: 현재 구조 FSD 위반 없음.

---

## 프로젝트 관례(shared → entities)에 대한 의견

**현재:** shared/api에서 entities의 타입·스키마를 참조하는 것을 “프로젝트 관례”로 허용하고 있음.

**장점**
- API 응답을 entities 스키마로 바로 검증·타입 추론 가능.
- 한 곳(entities)에서 도메인 타입을 정의해 API·UI가 같은 타입을 쓰기 쉬움.

**단점**
- FSD 원칙상 shared는 최하위 레이어이므로 entities에 의존하면 “역방향 의존”에 가깝고, shared가 도메인에 묶임.
- entities 스키마 변경 시 shared/api까지 영향. 배포·모듈 분리 시 결합도가 커짐.

**권장 방향**
1. **단기**: 현재처럼 “shared/api → entities 타입만 참조”하는 관례를 명시해 두고, 신규 API는 가능한 한 `shared/api` 내부에 DTO·스키마를 두는 패턴(workspace.ts처럼)을 우선 적용.
2. **중기**: API 전용 스키마를 `shared/api/schemas` 또는 `shared/api/dto`로 모아 두고, entities는 “UI·도메인 모델”로 한정. API 레이어는 shared 내 DTO만 사용하고, 페이지/위젯에서 DTO → entity 변환을 하거나, entities가 shared DTO를 재export하는 방식 검토.
3. **엄격히 가져갈 때**: shared/api는 순수 HTTP·스키마만 두고, “어떤 API가 어떤 entity 타입을 쓰는지”는 features나 app에서 연결. 이 경우 코드량·보일러플레이트는 늘어나지만 레이어 분리가 가장 분명해짐.

정리하면, **프로젝트가 더 커질 것을 가정하면 지금 shared DTO 레이어를 잡고 가는 것이 맞다.** 아래 점진적 계획대로 진행한다.

---

## 점진적 계획 (shared → entities 제거)

### Phase 1 — DTO 기반 마련 + users API ✅ 완료

| 단계 | 내용 | 상태 |
|------|------|------|
| 1-1 | `shared/api/dto` 폴더 생성, API 응답·요청용 DTO/스키마만 두는 규칙 정립 | ✅ |
| 1-2 | `shared/api/dto/user.ts`: 프로필 응답 DTO(스키마·타입) 정의 | ✅ |
| 1-3 | `shared/api/users.ts`: entities 제거, dto/user만 사용, 반환 타입 DTO | ✅ |
| 1-4 | `entities/user`: 도메인 타입 `User`는 shared DTO 타입 재사용(entities → shared 허용) | ✅ |

**완료:** `shared/api/users.ts`에서 `@/entities/user` import 없음.

### Phase 2 — 나머지 API 모듈 DTO 이전

| 대상 API | shared/api/dto | entities 참조 제거 | 상태 |
|----------|----------------|---------------------|------|
| library | dto/library.ts | library.ts | ✅ 완료 |
| studio-members | dto/studio.ts (멤버·초대) | studio-members.ts | ✅ 완료 |
| studio-chat | dto/chat.ts | studio-chat.ts | ✅ 완료 |
| studio-recording | dto/recording.ts | studio-recording.ts | ✅ 완료 |
| studio-stream | dto/stream.ts | studio-stream.ts | ✅ 완료 |
| studio-publish | dto/publish.ts | studio-publish.ts | ✅ 완료 |

각 API별로 응답·요청 스키마를 shared/api/dto에 두고, 해당 shared/api/*.ts는 entities 대신 dto만 import.

### Phase 3 — entities 역할 한정 ✅ 완료

| 단계 | 내용 | 상태 |
|------|------|------|
| 3-1 | chat, recording, stream, publish entities: API용 중복 스키마 제거 | ✅ |
| 3-2 | 해당 entities는 shared DTO re-export만 유지 (단일 소스: shared/api/dto) | ✅ |

**entities 역할 정리**
- **API 타입·스키마**: `shared/api/dto/*`가 단일 소스. entities(chat, recording, stream, publish, user, video, studio 멤버)는 필요 시 shared DTO를 re-export해 기존 `@/entities/*` import 호환 유지.
- **UI·도메인·폼 검증**: entities는 도메인 모델·폼 스키마(예: user 로그인/회원가입, video 목록 검증, studio 생성 등)에서 계속 사용. 신규 API 응답 타입은 shared DTO에 두고 entities는 re-export 또는 매핑만 수행.

---

## 워크스페이스 다크/라이트

- 레이아웃·사이드바·탑네브·알림 패널: `useWorkspaceThemeStore`로 테마 적용 완료.
- 워크스페이스 **콘텐츠**(홈, 받은 초대 등): 각 위젯/페이지에서 `useWorkspaceThemeStore`로 테마 클래스 적용해 다크/라이트 일관되게 유지.
