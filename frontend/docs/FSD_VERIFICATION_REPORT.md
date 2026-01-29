# FSD 구조 검증 보고서

> 검증일: 2026-01-29  
> 기준: Feature-Sliced Design 레이어 의존성 규칙

## FSD 레이어 의존성 (참고)

```
app (pages)  →  widgets  →  features  →  entities  →  shared
     ↑              ↑            ↑            ↑            ↑
   최상위        하위만 참조   하위만 참조   하위만 참조   의존 없음
```

- **규칙**: 각 레이어는 **같은 레이어** 또는 **아래 레이어**만 import 가능.
- **shared**: 어떤 FSD 레이어(entities, features, widgets, app) 및 **app 수준 상태(stores)** 도 참조하면 안 됨.

---

## ✅ 잘 지키고 있는 부분

| 항목 | 상태 |
|------|------|
| **entities** | features/widgets/app 참조 없음 ✅ |
| **widgets → app** | app 참조 없음 ✅ |
| **app** | widgets, features, entities, shared만 사용 ✅ |
| **tsconfig paths** | `@/shared/*`, `@/widgets/*`, `@/features/*`, `@/entities/*` 설정됨 ✅ |
| **슬라이스 구조** | entities/features는 `model`, `ui` 등 세그먼트 분리 ✅ |
| **widgets → features** | widgets가 features 사용 (허용) ✅ |

---

## 점진적 개선 단계

| 단계 | 내용 | 상태 |
|------|------|------|
| **1단계** | shared → entities 제거 (canvas 타입을 shared에 정의) | ✅ 완료 (2026-01-29) |
| **2단계** | features → widgets 제거 (page → widget → feature 흐름으로 리팩터) | ✅ 완료 (2026-01-29) |
| **3단계** | shared → stores 제거 (API 토큰 인터셉터를 app 레이어로 이동) | ✅ 완료 (2026-01-29) |

---

## ❌ 위반 사항

### 1. ~~shared → entities~~ → ✅ 1단계에서 해결됨

**규칙**: shared는 최하위 레이어이므로 entities를 참조하면 안 됨.

**조치 완료**: `shared/lib/canvas/types.ts`에 `LayoutType`, `SourceType`, `Source`를 직접 정의하고 entities import 제거. `test-utils.ts`는 `./types`에서 import. (entities/studio와 구조 동일하여 위젯·훅에서 전달 시 호환 유지.)

---

### 2. ~~features → widgets~~ → ✅ 2단계에서 해결됨

**규칙**: features는 widgets 아래 레이어이므로 widgets를 import하면 안 됨.  
**올바른 방향**: page → **widgets** → features (위젯이 feature를 조합).

| feature | widget 참조 |
|---------|----------------|
| `features/favorites/favorite-management` | FavoriteTable, InviteMemberDialog |
| `features/studio/studio-main` | StudioHeader, PreviewArea, LayoutControls, ScenesPanel, SourcesPanel, ControlBar, StudioSidebar |
| `features/studio/studio-creation` | CreateStudioDialog |
| `features/channels/channel-management` | ChannelCard, AddChannelDialog |
| `features/library/video-library` | VideoCard, VideoFilter |

**조치 완료 (2단계)**: B안 적용. 각 feature에서 비즈니스 로직만 **훅**으로 추출하고, 복합 UI는 **widget**으로 이동. 채널·즐겨찾기·스튜디오 생성/메인·비디오 라이브러리·워크스페이스 홈 모두 page → widget → feature 흐름으로 정리됨.

(위 표는 2단계 이전 위반 목록. 현재는 각 feature가 훅만 export하고, 동일 이름의 복합 UI는 widgets에 두어 위반 해소.)
- ~~**A안 (권장)**~~: page에서 **widget**을 직접 조합.  
  - 예: `ChannelManagement` feature는 “채널 목록 + 추가 다이얼로그” **로직/상태**만 담고,  
  - page 또는 **channel-management용 widget** 하나가 `ChannelCard`, `AddChannelDialog`를 조합하고, 그 위젯이 feature를 사용.
- **B안**: feature 내부에 있던 “복합 UI 블록”을 **widget 슬라이스**로 올리고, feature는 훅/상태/비즈니스 로직만 두고, 새 widget이 feature + shared/ui만 사용하도록 리팩터.

---

### 3. ~~shared → stores~~ → ✅ 3단계에서 해결됨

**규칙**: shared는 최하위 레이어이므로 app 수준 상태(stores)를 참조하면 안 됨.

**위반**: `shared/api/client.ts`에서 `useAuthStore`를 import하여 요청 인터셉터에서 토큰을 주입하고 있었음.

**조치 완료 (3단계)**:
- `shared/api/client.ts`에서 `useAuthStore` import 및 요청 인터셉터 제거. `axiosInstance`만 export.
- `app/providers/ApiAuthProvider.tsx` 추가: app 레이어에서 stores와 shared를 연결하여, 마운트 시 `axiosInstance`에 토큰 인터셉터를 등록.
- `app/layout.tsx`에서 `<ApiAuthProvider />` 렌더링.

---

## ⚠️ 참고 사항 (FSD와의 관계)

| 항목 | 위치 | 비고 |
|------|------|------|
| **stores** | `src/stores/` | FSD 레이어 밖. app/features/widgets에서만 사용. **shared는 stores를 참조하지 않음** (3단계에서 해소). |
| **hooks** | `src/hooks/` | `hooks/studio`, `hooks/common` 등. 위젯/feature에서 사용 시 해당 레이어 규칙만 지키면 됨. |
| **mock** | `src/mock/` | MSW 등 테스트/모킹 전용. app에서만 로드하면 FSD와 무관. |

---

## 요약

| 구분 | 결과 |
|------|------|
| **레이어 구조** | app, widgets, features, entities, shared 디렉터리 구조는 FSD와 일치 ✅ |
| **의존성 위반** | ~~shared → entities~~ ✅ 해결, ~~features → widgets~~ ✅ 2단계 해결, ~~shared → stores~~ ✅ 3단계 해결 |
| **전체 평가** | 1·2·3단계 적용으로 shared가 entities/widgets/stores를 참조하지 않음. page → widget → feature 흐름 정립. |

---

## 권장 조치 순서 (점진적 개선)

1. ~~**shared → entities 제거**~~ → **완료**  
   - `shared/lib/canvas/types.ts`에 LayoutType, SourceType, Source 정의. entities import 제거.

2. ~~**features → widgets 제거**~~ → **완료**  
   - 각 feature를 “로직/상태만” 담는 계층으로 두고,  
   - “페이지용 복합 UI”는 **widget**으로 새로 만들거나 기존 widget을 재구성해,  
   - **page → widget → feature** 흐름으로 맞춤.

3. ~~**shared → stores 제거**~~ → **완료 (3단계)**  
   - `shared/api/client.ts`에서 `useAuthStore` 제거. 토큰 인터셉터는 `app/providers/ApiAuthProvider.tsx`에서 등록.

4. (선택) **stores/hooks**를 FSD 레이어에 맞춰 배치  
   - 예: 도메인별 store는 해당 **entity/feature** 옆이나 `shared`로 이동 검토.

---

## 스튜디오 프리뷰(Konva) 변경 검증 (2026-01-29)

| 대상 | 의존 관계 | FSD 준수 |
|------|-----------|----------|
| **widgets/studio/preview-area** | → entities/studio (LayoutType, Source), → features/studio/studio-main (GetPreviewStreamRef, SourceTransform), → shared (utils, canvas, device-preferences) | ✅ widget은 feature·entities·shared만 참조 |
| **features/studio/studio-main** | → entities, shared, stores (useAuthStore) | ✅ feature는 하위 레이어만 참조 |
| **hooks/studio** | → entities, shared | ✅ shared는 stores/entities를 참조하지 않음 (hooks는 app 계층에서 사용) |

**결론**: Konva 전환·드래그/리사이즈/레이어·해상도·소스 패널 제거 등 이번 변경에서 **새 FSD 위반 없음**. page → widget(StudioMain) → feature(useStudioMain) + hooks(useSourceStreams) 흐름 유지.

이 검증 결과와 점진적 조치를 반영하면 FSD 구조가 더 일관되게 유지됩니다.
