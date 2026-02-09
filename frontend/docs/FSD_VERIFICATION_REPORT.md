# FSD 구조 검증 및 수정 보고서

## FSD 레이어 규칙 (참고)

- **app**: 모든 레이어 참조 가능
- **widgets**: features, entities, shared 참조 (다른 widgets는 조합 시 허용)
- **features**: entities, shared만 참조 (widgets 참조 금지)
- **entities**: shared만 참조
- **shared**: 외부 라이브러리만 참조 (stores, entities 참조 금지)

---

## 수정 완료 항목

### 1. shared → stores 참조 제거 (FSD 위반 해소)

- **문제**: `shared/api/client.ts`에서 `useAuthStore`를 import하여 요청 인터셉터에서 토큰/X-User-Id 주입
- **조치**: 요청 인터셉터를 **app** 레이어로 이동
  - `shared/api/client.ts`: `useAuthStore` import 및 요청 인터셉터 제거
  - `app/providers/ApiAuthProvider.tsx`: 요청 인터셉터 등록 시 `Authorization` + `X-User-Id` 모두 설정

### 2. features → widgets 참조 제거 (FSD 위반 해소)

- **문제**: `features/studio/studio-main/ui/StudioMain.tsx`가 여러 `@/widgets/studio/*` 컴포넌트를 import
- **조치**: 해당 파일 삭제
  - 앱에서는 이미 `widgets/studio/studio-main`만 사용 중
  - feature는 `useStudioMain` 훅과 타입만 export (`index.tsx` 유지)

### 3. widget → feature 내부 경로 참조 제거 (FSD 공개 API 사용)

- **문제**: `widgets/library/video-detail/video-detail-viewer.tsx`가 `@/features/library/video-library/ui/*` 내부 경로 직접 import
- **조치**: feature의 공개 API로만 참조
  - `features/library/video-library/index.tsx`에 `VideoPlayer`, `VideoSidebar`, `AnalysisChart`, `VideoInfoSection`, `TrimSection` re-export 추가
  - `video-detail-viewer.tsx`는 `@/features/library/video-library`에서만 import

---

## 유지·참고 사항

### shared/api가 entities를 참조하는 경우

- `shared/api/studio-chat.ts`, `studio-members.ts`, `studio-recording.ts`는 `@/entities/*` 스키마를 사용
- 엄격한 FSD에서는 shared가 entities를 참조하지 않도록 하고, 해당 API 모듈을 features 등 상위 레이어로 옮기는 방식을 권장
- 현재는 타입 안전한 API 래퍼 목적으로 유지하고, 추후 features/studio 등으로 이전 검토 가능

### entities가 shared를 참조하는 경우

- `entities/favorite/model/schemas.ts`에서 `@/shared/api/schemas`의 `DeleteResponseSchema` 사용
- FSD상 **entities → shared** 참조는 허용됨 (유지)

---

## 에러 위험 포인트 (수정 완료)

- **문제**: `catch (error: any)` 사용으로 타입 안전성 및 런타임 위험
- **조치**:
  - `shared/lib/error-utils.ts` 추가: `getHttpErrorStatus(error: unknown)`, `getHttpErrorMessage(error: unknown, fallback?)`
  - LoginForm, SignupForm: `error: unknown` + `getHttpErrorStatus` / `getHttpErrorMessage` 사용
  - OAuth 콜백 페이지 (auth, channels): `error: unknown` + `Error` 타입 가드 또는 `getHttpErrorMessage` 사용
