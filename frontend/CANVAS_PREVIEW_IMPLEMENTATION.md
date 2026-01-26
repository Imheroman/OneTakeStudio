# Canvas API 기반 비디오 Preview 구현

## 📋 구현 개요

Studio 페이지에서 Canvas API를 사용한 비디오 preview 기능을 구현했습니다. 향후 OffscreenCanvas를 통한 성능 최적화를 고려한 구조로 설계되었습니다.

## 🏗️ 구조

### 1. Canvas 유틸리티 (`shared/lib/canvas/`)

#### `types.ts`
- Canvas 렌더링 관련 타입 정의
- `RenderSource`, `LayoutGrid`, `CanvasRenderOptions`, `SourceRenderContext`

#### `layout.ts`
- 레이아웃 계산 유틸리티
- `getLayoutGrid()`: 레이아웃 타입에 따른 그리드 계산
- `arrangeSourcesInLayout()`: 소스들을 레이아웃에 맞게 배치
- 지원 레이아웃: `full`, `split`, `three-grid`, `four-grid`, `custom`

#### `renderer.ts`
- 소스 타입별 렌더링 함수
- `renderVideoSource()`: 비디오 소스 렌더링
- `renderImageSource()`: 이미지 소스 렌더링
- `renderTextSource()`: 텍스트 소스 렌더링
- `renderBrowserSource()`: 브라우저 소스 렌더링
- `renderAudioSource()`: 오디오 소스 시각화
- `renderSourceByType()`: 소스 타입에 따라 적절한 렌더링 함수 호출

#### `offscreen.ts`
- OffscreenCanvas 지원 유틸리티 (향후 확장용)
- `isOffscreenCanvasSupported()`: 지원 여부 확인
- `createOffscreenCanvas()`: Canvas를 OffscreenCanvas로 변환
- `shouldUseOffscreenCanvas()`: 사용 여부 결정 로직

### 2. Custom Hook (`hooks/studio/useCanvasPreview.ts`)

Canvas 렌더링을 관리하는 React 훅:

- **Canvas 크기 자동 조정**: ResizeObserver를 사용한 반응형 크기 관리
- **렌더링 루프**: `requestAnimationFrame`을 사용한 60fps 렌더링
- **소스 엘리먼트 관리**: 소스별 HTML 엘리먼트 등록/해제
- **비디오/오디오 상태 반영**: `isVideoEnabled`, `isAudioEnabled` 상태에 따른 렌더링

### 3. PreviewArea 컴포넌트 (`widgets/studio/preview-area/`)

Canvas를 사용한 preview 영역 컴포넌트:

- 소스가 있을 때: Canvas 렌더링
- 소스가 없을 때: 플레이스홀더 표시
- 레이아웃, 소스, 비디오/오디오 상태를 props로 받음

## 🎨 지원 기능

### 레이아웃 타입

1. **Full**: 전체 화면 (1x1)
2. **Split**: 좌우 분할 (1x2)
3. **Three Grid**: 2x2 그리드 (4개 셀)
4. **Four Grid**: 2x2 그리드 (4개 셀)
5. **Custom**: 커스텀 레이아웃 (현재는 full과 동일)

### 소스 타입

1. **Video**: 비디오 스트림/파일
2. **Image**: 이미지 파일
3. **Text**: 텍스트 오버레이
4. **Browser**: 브라우저 캡처
5. **Audio**: 오디오 시각화

## 🔄 렌더링 흐름

```
1. PreviewArea 컴포넌트 마운트
   ↓
2. useCanvasPreview 훅 초기화
   ↓
3. Canvas 크기 계산 (ResizeObserver)
   ↓
4. 렌더링 루프 시작 (requestAnimationFrame)
   ↓
5. 레이아웃에 맞게 소스 배치 계산
   ↓
6. 각 소스 타입별 렌더링 함수 호출
   ↓
7. Canvas에 그리기
   ↓
8. 다음 프레임 요청 (반복)
```

## 🚀 향후 확장 계획

### OffscreenCanvas 지원

현재 구조는 OffscreenCanvas로 쉽게 전환할 수 있도록 설계되었습니다:

```typescript
// 향후 구현 예시
const offscreen = createOffscreenCanvas(canvas);
if (offscreen) {
  // Web Worker에서 렌더링 수행
  worker.postMessage({ canvas: offscreen }, [offscreen]);
}
```

### 성능 최적화

- **조건부 OffscreenCanvas 사용**: 소스가 많거나 해상도가 높을 때만 사용
- **Web Worker 렌더링**: 메인 스레드 부하 감소
- **프레임 드롭 방지**: 성능 모니터링 및 적응형 렌더링

## 📝 사용 예시

```tsx
<PreviewArea
  layout="split"
  sources={studio.sources}
  isVideoEnabled={true}
  isAudioEnabled={true}
/>
```

## 🔧 주요 파일

- `shared/lib/canvas/types.ts`: 타입 정의
- `shared/lib/canvas/layout.ts`: 레이아웃 계산
- `shared/lib/canvas/renderer.ts`: 렌더링 로직
- `shared/lib/canvas/offscreen.ts`: OffscreenCanvas 지원
- `hooks/studio/useCanvasPreview.ts`: React 훅
- `widgets/studio/preview-area/ui/PreviewArea.tsx`: Preview 컴포넌트

---

*작성일: 2026-01-26*
