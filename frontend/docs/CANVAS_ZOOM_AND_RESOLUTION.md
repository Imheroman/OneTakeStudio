# 캔버스 줌·해상도·레이아웃 정책 (Current vs Target)

상용 서비스처럼 **캔버스를 하나의 '이미지'가 아니라 '독립적인 렌더링 엔진'**으로 취급합니다. Konva.js + **pixelRatio를 devicePixelRatio 및 브라우저 줌(visualViewport)과 연동**해, 화면 확대 시에도 미리보기(메인 프레임)가 선명하게 유지되도록 합니다.

| 구분 | 일반적인 현상 (현재 상태) | 상용 서비스 방식 (Target) | 본 프로젝트 대응 |
|------|---------------------------|----------------------------|------------------|
| **줌 발생 시** | 캔버스 좌표계와 UI가 함께 뭉개짐 | UI는 확대되더라도 캔버스 프레임은 선명함 유지 | Stage `pixelRatio` = devicePixelRatio × visualViewport.scale, CSS `transform: scale()`로 논리 크기 고정 |
| **해상도 관리** | 브라우저 기본 CSS 픽셀 사용 | devicePixelRatio 기반 물리 픽셀 관리 | Stage에 `pixelRatio={effectivePixelRatio}`(줌 반영), Konva가 논리 크기 × pixelRatio로 렌더링 |
| **레이아웃** | 확대 배율에 따라 요소가 밀려남 | 가상 좌표계(Virtual Resolution) 기반 고정 배치 | `RESOLUTION_SIZE`(720p/1080p) 고정, 모든 소스 좌표는 논리 좌표만 사용, 표시 시에만 scale 적용 |

---

## 1. 줌 발생 시 (캔버스 선명도 · 독립 렌더링 엔진)

- **Target**: 브라우저 줌(확대/축소)이 되어도 캔버스 프레임은 선명하게 유지.
- **구현**:
  - **effectivePixelRatio** = `devicePixelRatio × visualViewport.scale` (1~5로 클램프). `visualViewport`의 resize/scroll 이벤트로 줌 변경 시 즉시 반영.
  - Stage에 **pixelRatio={effectivePixelRatio}** 전달 → 캔버스 백링이 **논리 크기 × effectivePixelRatio**로 그리므로, 화면 확대 시에도 픽셀 밀도가 맞아 선명함 유지.
  - 표시 영역은 **CSS `transform: scale(scale)`**만 사용. Stage의 width/height는 항상 논리 해상도(1920×1080 등)로 고정.

## 2. 해상도 관리 (물리 픽셀)

- **Target**: CSS 픽셀에만 의존하지 않고, devicePixelRatio·브라우저 줌을 반영한 물리 픽셀 단위로 캔버스를 관리.
- **구현**:
  - `PreviewArea`에서 **effectivePixelRatio**로 Stage에 전달. Konva가 `실제 캔버스 픽셀 수 = 논리 크기 × pixelRatio`로 그리므로, 고배율·브라우저 줌에서도 선명하게 표시.

## 3. 레이아웃 (가상 좌표계)

- **Target**: 화면/줌 배율과 무관하게, 가상 해상도(Virtual Resolution) 기준으로 요소가 고정 배치.
- **구현**:
  - `RESOLUTION_SIZE`: 720p(1280×720), 1080p(1920×1080) 등 **마스터 해상도**만 사용.
  - 소스 위치·크기(`sourceTransforms`, 레이아웃 셀)는 모두 이 논리 좌표(x, y, width, height)로만 저장·계산.
  - 브라우저 창/컨테이너 크기가 바뀌어도 **내부 데이터는 변경하지 않고**, 보여줄 때만 `scale = min(containerWidth/stageWidth, containerHeight/stageHeight)`로 스케일하여 표시.
  - 따라서 “확대 배율에 따라 요소가 밀려나는” 현상 없이, 가상 좌표계 기반 고정 배치가 유지됨.

---

## 관련 파일

- `frontend/src/widgets/studio/preview-area/ui/PreviewArea.tsx`: Stage `pixelRatio`, `RESOLUTION_SIZE`, `transform: scale(scale)` 적용.
- `frontend/src/shared/lib/canvas/fit.ts`: 소스별 contain/cover(Letterboxing·Pillarboxing) 계산.
- `frontend/src/entities/studio/model/schemas.ts`: Source `fit` 속성(optional).
