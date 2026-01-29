# 스튜디오 하이브리드 UX 기능 생명 주기 및 오류 검토

## 1. 기능 생명 주기

### 1.1 진입 → 준비(스테이징)

| 단계 | 동작 | 상태 |
|------|------|------|
| 스튜디오 입장 | `fetchStudio()` → 씬 목록 로드 | `isEditMode: true`, `isLive: false` |
| 씬 선택 | `activeSceneId` 설정, 해당 씬의 `layout.elements` → `sources` 동기화 | `canAddSource: true` |
| 소스 추가 | Add Source 다이얼로그 → 비디오/오디오 선택 → `sources`에 추가 | 로컬 상태만 반영(저장 버튼 없음) |
| 레이아웃 변경 | LayoutControls로 full/split/grid 전환 | `currentLayout` 로컬 상태 |
| 소스 ON/OFF | SourcesPanel 토글 | `sources[].isVisible` 로컬 상태 |

- **프리뷰 라벨:** "스테이징" (amber)
- **헤더:** "잠금" 버튼 표시(클릭 시 편집→라이브 전환)

### 1.2 Go Live → 라이브

| 동작 | 결과 |
|------|------|
| Go Live 클릭 | `setIsLive(true)`, `setIsEditMode(false)` |
| 헤더 | Go Live 버튼 비활성화, 문구 "Live", 타이머 시작 |
| 프리뷰 라벨 | "Live" (red) |
| 잠금/편집 | "편집" 버튼으로 전환 가능(잠금 해제) |

- **End Live:** 현재 없음. 라이브 종료는 스튜디오 나가기 등 별도 플로우로 가정.

### 1.3 라이브 → 다시 편집

| 동작 | 결과 |
|------|------|
| "편집" 클릭 | `setIsEditMode(true)` |
| 프리뷰 라벨 | "스테이징"으로 복귀 |
| `isLive` | 그대로 `true`, Go Live 버튼은 계속 비활성화 |

### 1.4 씬 삭제

- 삭제 시 `fetchStudio()` 후, 삭제된 씬이 `activeSceneId`였으면 `setActiveSceneId("")` 호출.
- `activeScene`이 null이 되면 복구 effect가 남은 씬 중 첫 씬으로 `activeSceneId` 설정 → 정상 복구.

---

## 2. 오류·엣지 케이스 검토

### 2.1 정상 동작으로 확인된 부분

- **씬 없음:** `canAddSource: false`, SourcesPanel에 "씬을 먼저 선택하세요." 표시, 소스 추가 버튼 비활성화.
- **씬 전환:** `activeSceneId` 변경 시 해당 씬의 `layout.elements` → `sources` 동기화.
- **씬 삭제 후:** `activeSceneId` 초기화 → 복구 effect로 첫 씬 자동 선택.
- **Go Live 후:** 편집 버튼으로 잠금 해제 가능, 프리뷰 라벨 스테이징/Live 일치.

### 2.2 개선 권장(비차단)

| 항목 | 내용 | 권장 |
|------|------|------|
| **미사용 코드** | `handleSaveSceneLayout`이 UI에서 호출되지 않음(레이아웃 저장 버튼 제거됨). | 제거해도 됨. 나중에 "자동 저장" 등 도입 시 재사용 가능하므로 유지해도 됨. |
| **레이아웃 미저장** | 소스 추가/제거·레이아웃 변경이 로컬만 반영. 씬 전환 시 서버 layout으로 덮어쓰고, 새로고침 시 로컬 변경분 손실. | 전략상 비우선이므로 현재는 허용. 필요 시 자동 저장 또는 저장 버튼 재도입. |
| **End Live 없음** | Go Live 후 "방송 종료" 버튼 없음. `isLive`가 true로 유지. | 의도된 설계로 보임. 나가기 시 라이브 종료로 간주할 수 있음. 필요 시 "방송 종료" 추가 검토. |

### 2.3 에러 처리

- `fetchStudio` 실패: `console.error`, `studio`는 이전 값 유지.
- 씬 삭제/추가/씬 레이아웃 API 실패: `console.error`, 확인 다이얼로그는 없음(추가 시 토스트 등 고려 가능).
- 로컬 녹화: `getPreviewStreamRef?.current` 없거나 스트림 없으면 `console.warn` 후 무시.

### 2.4 접근성·UX

- SourcesPanel 소스 ON/OFF에 `role="switch"`, `aria-checked` 사용 → 적절함.
- PreviewArea 스테이징/Live 라벨은 시각적 구분용, 스크린 리더용 `aria-label` 추가 시 접근성 향상 가능.

---

## 3. 요약

- **생명 주기:** 진입 → 씬 선택 → 소스/레이아웃 준비(스테이징) → Go Live → (선택) 편집 재개. 흐름과 상태 전환은 일관됨.
- **오류:** 현재 확인된 기능 오류 없음. 미사용 코드·레이아웃 미저장·End Live 부재는 정책/우선순위 이슈로, 필요 시 단계적으로 개선하면 됨.
