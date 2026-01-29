# 동적 그리드 시스템 (Dynamic Grid System)

송출 화면은 **16:9 비율을 고정**하고, 인원 수에 맞는 **세분화된 템플릿**으로 소스 배치만 전환하는 방식입니다. OBS처럼 일일이 크기를 조절하지 않고, **버튼 하나로 “가장 보기 좋은 상태”**를 제공합니다.

---

## 1. 뷰포트 대응 반응형 (Viewport Responsive)

- **변하는 것**: 시청자 기기가 아니라 **호스트가 보는 편집 화면**이 기기별로 최적화됩니다.
- **변하지 않는 것**: 송출되는 **최종 결과물**은 항상 **16:9** 비율 유지.
- **동작**: 16:9 프레임 안의 소스 배치만 **인원 수에 맞는 세분화된 템플릿** 중 하나로 갈아끼웁니다.

| 인원/상황 | 템플릿 예시 | 설명 |
|-----------|-------------|------|
| 1인 | full | 전체 화면 |
| 2인 | split | 좌우 2분할 |
| 3인 | three-grid | 2×2 그리드(큰 셀 + 작은 셀 3) |
| 4인 | four-grid | 2×2 균등 그리드 |
| 사용자 정의 | custom | 드래그/리사이즈로 커스텀 |

---

## 2. 설계 철학 (Design Philosophy)

### 2.1 사용자 의사결정 비용 감소

- OBS처럼 **일일이 크기·위치를 조절할 필요 없이**, 퀵 레이아웃 버튼 하나로 “가장 보기 좋은 상태”를 제공.
- 인원이 바뀌어도 **세분화된 템플릿**만 선택하면 일관된 구도 유지.

### 2.2 브랜딩 일관성

- **어떤 인원이 들어와도** 여백(Gutter)과 정렬이 **동일한 규칙**으로 적용.
- `shared/lib/canvas/layout.ts`의 **GRID_GUTTER**(기본 8px) 등 그리드 상수로 여백·정렬을 통일해 방송 퀄리티를 일정하게 유지.

### 2.3 유료화 차별점

- 기본 플랜: full / split / three-grid / four-grid 등 **고정 템플릿**.
- 유료 플랜: **더 복잡·화려한 레이아웃**, **커스텀 배치·저장** 등을 차별화 포인트로 제안.

---

## 3. 기술 구현 요약

- **출력 비율**: `RESOLUTION_SIZE`(720p: 1280×720, 1080p: 1920×1080) → 항상 16:9.
- **그리드**: `getLayoutGrid(layout, canvasWidth, canvasHeight)` + **GRID_GUTTER**로 셀 위치·크기 계산.
- **편집 화면**: 호스트 뷰는 컨테이너 크기에 맞춰 `scale`만 적용하고, **논리 좌표계(가상 해상도)**는 변경하지 않음.

---

## 관련 파일

- `frontend/src/shared/lib/canvas/layout.ts`: 그리드·gutter 상수, `getLayoutGrid`, `arrangeSourcesInLayout`
- `frontend/src/widgets/studio/preview-area/ui/PreviewArea.tsx`: 16:9 Stage, scale, 소스 배치
- `frontend/src/widgets/studio/layout-controls/ui/LayoutControls.tsx`: 퀵 레이아웃 버튼(템플릿 전환)
