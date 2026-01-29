# Konva / react-konva 도입 타당성 검토

## 목적

멀티 소스(웹캠, 마이크, 이미지 등)를 메인 비디오(PreviewArea)에서 배치·렌더링할 때, **Konva.js** 및 **react-konva** 도입이 타당한지 검토한다.

---

## 현재 방식 (Raw Canvas + requestAnimationFrame)

- **구조**: `useCanvasPreview` + `@/shared/lib/canvas` (layout, renderer)
- **흐름**: 소스별로 `HTMLVideoElement`/이미지 생성 → `registerSourceElement`로 등록 → `requestAnimationFrame` 루프에서 `arrangeSourcesInLayout` + `renderSourceByType`로 2D 캔버스에 그리기
- **장점**: 의존성 없음, `captureStream()`으로 녹화·송출 연동 용이
- **단점**: 프리뷰 내 드래그/리사이즈 등 인터랙션을 직접 구현해야 함

---

## Konva / react-konva 요약

| 항목 | 설명 |
|------|------|
| **Konva** | 2D 캔버스 라이브러리. Stage → Layer → Shape 계층, 이벤트·드래그·트랜스폼 지원 |
| **react-konva** | Konva를 React 컴포넌트로 래핑. Stage, Layer, Rect, Image, Text 등 |
| **비디오** | Konva는 비디오를 직접 재생하지 않음. DOM `<video>`를 만들고 `Konva.Animation`으로 매 프레임 `layer.draw()` 호출해 Image 노드에 그리는 패턴 사용 |

---

## 타당성 정리

### Konva/react-konva를 쓰면 좋은 경우

1. **프리뷰 영역에서 소스 드래그·리사이즈·회전**  
   노드 단위 이벤트·트랜스폼을 쓰면 OBS 스타일 배치 UI를 구현하기 수월함.
2. **레이어/노드 트리 구조**  
   소스 순서, 그룹, 가시성 등을 트리로 다루기 편함.
3. **React와의 통합**  
   react-konva로 Stage/Layer/Image를 컴포넌트로 선언하면 상태·레이아웃을 React 방식으로 관리 가능.

### 도입 시 고려사항

1. **비디오는 여전히 애니메이션 루프 필요**  
   Konva도 비디오 프레임 갱신을 위해 `Konva.Animation` 등으로 주기적 `layer.draw()`가 필요함. 현재의 requestAnimationFrame 루프와 역할이 유사함.
2. **의존성·번들**  
   konva + react-konva 추가. 번들 크기와 유지보수 비용 증가.
3. **captureStream 연동**  
   Stage의 캔버스에 대해 `canvas.captureStream()`을 쓰는 방식은 현재와 동일하게 가능. 다만 Stage/Layer 구조에 맞춰 대상 캔버스를 선택해야 함.
4. **마이그레이션**  
   기존 `useCanvasPreview` + layout/renderer를 Konva Stage/Layer/Image 구조로 옮기는 작업 필요.

---

## 결론 및 권장

- **현재 버그(스테이지 소스가 프리뷰에 안 나오는 문제)**  
  Konva와 무관한 **캔버스 마운트·크기 갱신 타이밍** 이슈로 판단했고, `useCanvasPreview`에서 다음으로 수정함:
  - `sources.length`를 ResizeObserver effect 의존에 포함해, 소스가 생기며 캔버스가 처음 마운트될 때 크기 갱신
  - 소스는 있는데 크기가 0일 때 `requestAnimationFrame`으로 한 번 더 `updateCanvasSize()` 호출
- **Konva/react-konva 도입**  
  - **지금 당장 필수는 아님.**  
    멀티 소스 “출력” 자체는 현재 Raw Canvas 방식으로 가능하며, 위 수정으로 스테이지 소스 미출력 문제를 해결하는 것이 우선.
  - **프리뷰 내 드래그·리사이즈·레이어 편집**을 본격적으로 넣을 계획이 있으면, 그때 Konva/react-konva 도입을 검토하는 것이 타당함.
  - 도입 시에는 기존 `arrangeSourcesInLayout`/`renderSourceByType`를 Konva Stage/Layer/Image + `Konva.Animation`(비디오 갱신) 구조로 단계적으로 치환하는 방식을 권장.

---

## 참고

- [Konva – Video on Canvas](https://konvajs.org/docs/sandbox/Video_On_Canvas.html)
- [react-konva](https://konvajs.org/docs/react/index.html)
- [Play video on Canvas in React Konva (Stack Overflow)](https://stackoverflow.com/questions/59741398/play-video-on-canvas-in-react-konva)
