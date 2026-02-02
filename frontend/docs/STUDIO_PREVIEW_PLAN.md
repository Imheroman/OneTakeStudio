# 스튜디오 프리뷰·소스 계획 (적용 및 예정)

## 적용 완료 (이번 변경)

### 1. 소스 패널 제거

- **이유**: 백스테이지(스테이징 영역)에서 이미 소스 목록·ON/OFF·Add to stage/Remove from stage·드래그 정렬을 모두 제공하므로, 하단의 "소스" 패널과 기능이 중복됨.
- **조치**: `StudioMain`에서 `SourcesPanel` 제거. 씬 패널만 하단에 유지.

### 2. 해상도 배지 및 설정

- **배지**: 프리뷰 좌상단 "프리뷰" / "Live" 자리에 **해상도(720p / 1080p)** 표시.
  - 편집 모드: `720p` 또는 `1080p`
  - Live 모드: `Live 720p` / `Live 1080p`
- **설정**: 컨트롤 바에 해상도 선택 메뉴(720p / 1080p) 추가. 선택 값은 `previewResolution` 상태로 유지.
- **참고**: 현재는 UI·상태만 반영. 실제 캔버스/캡처 해상도를 720p·1080p로 제어하려면 `useCanvasPreview`·`getCaptureStream` 등에서 해상도별 크기/비트레이트 적용이 추가로 필요함.

### 3. 화면 소스(screen)

- **소스 타입**: `entities/studio` 스키마에 `screen` 추가.
- **추가 흐름**: 소스 추가 다이얼로그에 "화면 공유" 섹션 추가 → 선택 시 `onSelect("screen")` → 백스테이지에 "화면 공유" 소스 추가.
- **미디어**: `useSourceStreams`에서 `type === "screen"`일 때 `getDisplayMedia({ video: true, audio: isAudioEnabled })` 호출. 스트림은 기존과 동일하게 `getStream(sourceId)`로 전달.
- **렌더**: 프리뷰·백스테이지 타일 모두 비디오 소스와 동일하게 `HTMLVideoElement` + 스트림으로 표시. 캔버스 렌더러는 `screen`을 `renderVideoSource`로 처리.

---

## 적용 완료 (Konva 전환)

### 4. Konva.js 전환 (드래그/리사이즈/레이어·해상도)

- **konva**, **react-konva** 설치 완료.
- **PreviewArea**를 Raw Canvas 대신 Konva `Stage` + `Layer` + 소스별 `Group`(비디오/이미지/플레이스홀더) 구조로 전환.
- **해상도**: Stage 크기를 720p(1280×720), 1080p(1920×1080)로 설정하고, 컨테이너에 맞춰 scale로 표시. `getCaptureStream`은 Layer의 canvas에서 해상도에 맞는 스트림 반환.
- **드래그**: 편집 모드에서 소스 `Group`을 `draggable`로 이동, `onDragEnd`에서 `setSourceTransform(id, { x, y })` 호출.
- **리사이즈**: 소스 클릭 시 `Transformer` 표시, `onTransformEnd`에서 `getClientRect()`로 위치·크기 반영 후 `setSourceTransform` 호출.
- **레이어(z-order)**: 소스 클릭 시 해당 소스의 `zIndex`를 최상단으로 올려 앞으로 가져오기. `sourceTransforms`와 정렬 순서로 렌더 순서 결정.
- **상태**: `useStudioMain`에 `sourceTransforms`, `setSourceTransform` 추가. 씬 전환 시 `sourceTransforms` 초기화.

자세한 타당성·전환 시점은 `KONVA_FEASIBILITY.md` 참고.
