# FSD(Feature-Sliced Design) 구조 점검

## 레이어 및 의존 방향

- **app** → pages, widgets, features, entities, shared
- **widgets** → features, entities, shared
- **features** → entities, shared
- **entities** → shared
- **shared** → (다른 레이어 의존 금지)

규칙: **상위 레이어만 하위 레이어를 import**. shared는 최하위이므로 features/entities/widgets/app을 import하면 안 됨.

---

## 현재 위반·주의 사항

### 1. shared → entities (API 레이어)

| 파일 | 참조 |
|------|------|
| `shared/api/users.ts` | `@/entities/user/model` (User 타입) |
| `shared/api/studio-members.ts` | `@/entities/studio/model` (스키마·타입) |
| `shared/api/library.ts` | `@/entities/video/model` (Video, VideoStatus) |
| `shared/api/studio-publish.ts` | `@/entities/publish/model` |
| `shared/api/studio-stream.ts` | `@/entities/stream/model` |
| `shared/api/studio-recording.ts` | `@/entities/recording/model` |
| `shared/api/studio-chat.ts` | `@/entities/chat/model` |

**조치:**  
- `shared/api/workspace.ts`는 **수정 완료** — `RecentStudioSchema` 대신 로컬 `RecentStudioItemSchema` 사용, entities 미참조.  
- 나머지는 **프로젝트 관례**로 shared/api에서 entities 타입·스키마 참조를 허용. 추후 shared에 API 전용 DTO/스키마를 두고 entities는 도메인·UI용으로 한정할 수 있음.

### 2. entities → shared

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

## 워크스페이스 다크/라이트

- 레이아웃·사이드바·탑네브·알림 패널: `useWorkspaceThemeStore`로 테마 적용 완료.
- 워크스페이스 **콘텐츠**(홈, 받은 초대 등): 각 위젯/페이지에서 `useWorkspaceThemeStore`로 테마 클래스 적용해 다크/라이트 일관되게 유지.
