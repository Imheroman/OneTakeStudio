# 에러 위험·병목·레이스 컨디션 점검

실제 서비스 랜딩까지 고려한 에러 위험점, 병목, 워크스페이스 레이스 컨디션 점검 및 해결 내역.

---

## 1. 에러 위험점

### 1.1 해결 완료

| 항목 | 위치 | 조치 |
|------|------|------|
| `error: any` | `shared/api/client.ts` POST `.catch()` | `error: unknown` + `isNetworkError(error)` 타입 안전 처리 |
| 네트워크 에러 판별 | `shared/lib/error-utils.ts` | `isNetworkError(error: unknown)` 추가, client에서 사용 |
| 로그인/회원가입 | LoginForm, SignupForm | `error: unknown` + `getHttpErrorStatus` / `getHttpErrorMessage` 사용 (기존 문서 기준) |

### 1.2 권장 사항

- **catch 블록**: `catch (error: unknown)` 사용, `getHttpErrorMessage(error)` 또는 `isNetworkError(error)`로 분기.
- **사용자 노출**: `alert(getHttpErrorMessage(error))` 또는 토스트로 일관 처리.
- **미처리 promise**: `async` 함수 내부는 try/catch, `.catch()` 사용 시 반드시 처리 또는 rethrow.

---

## 2. 병목

### 2.1 현재 구조

- **메인 레이아웃**: `fetchNotifications` 단일 호출, `useShortsPolling` 별도. 병렬화 필요 시 알림+폴링 동시 실행은 이미 분리됨.
- **워크스페이스 홈**: `getDashboard()` 1회. 대시보드 통계+최근 스튜디오가 한 응답이면 추가 병목 없음.
- **스튜디오 페이지**: 멤버/초대/세션 등 여러 API 호출 시 필요한 만큼만 호출, 과도한 직렬 호출 없음.

### 2.2 권장 사항

- 동일 페이지에서 **독립 API 여러 개** 호출 시 `Promise.all` 또는 병렬 훅으로 한 번에 요청.
- 대시보드처럼 **한 API로 묶인 응답**은 현재 방식 유지.

---

## 3. 워크스페이스 레이스 컨디션

### 3.1 해결 완료

| 항목 | 설명 | 조치 |
|------|------|------|
| **Stale response** | `useWorkspaceHome`에서 userId 변경 또는 빠른 이동 시 이전 요청 응답이 나중에 적용될 수 있음 | `latestRef`로 요청 세대 관리, 응답 적용 전 `requestId === latestRef.current` 검사로 무시 |
| **이중 리다이렉트** | (main) 레이아웃과 workspace 페이지 둘 다 비로그인 시 리다이렉트 | 레이아웃: `router.replace`로 비로그인 시 로그인 페이지. 페이지: **URL(id) 보정만** 수행, 비로그인 분기는 레이아웃에 일원화 |
| **히스토리 적체** | 비로그인 시 `router.push` 사용으로 뒤로가기 시 반복 리다이렉트 | 레이아웃·페이지 모두 `router.replace` 사용 |

### 3.2 랜딩 흐름 (실서비스 고려)

1. **초기**: `hasHydrated === false` → 레이아웃·워크스페이스 페이지 모두 리다이렉트 하지 않음, 로딩 UI만 표시.
2. **하이드레이션 완료**: `hasHydrated === true` → 레이아웃에서 `checkAuth()` 실패 시 `router.replace(/login?redirect=...)` 1회만 수행.
3. **워크스페이스 URL 보정**: 로그인된 상태에서 `/workspace/undefined` 등 잘못된 id면 `router.replace(/workspace/${user.userId})` 또는 `router.replace("/")`로 보정.
4. **대시보드 fetch**: `useWorkspaceHome`에서 `getDashboard()` 호출, 응답은 **최신 요청만** 반영(stale 무시).

---

## 4. 참고: 기타 catch 블록

- `error: any` 또는 `(error: any)` 사용처는 점진적으로 `error: unknown` + `getHttpErrorMessage` / `getHttpErrorStatus` / `isNetworkError`로 교체 권장.
- `console.error`만 하고 rethrow 하는 경우 타입만 `unknown`으로 통일해도 에러 위험 감소.
