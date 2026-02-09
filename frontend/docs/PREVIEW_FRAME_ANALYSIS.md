# 프리뷰 프레임 비율 이슈 분석

## 현상

- **최초** 스테이지에 소스를 올리면: 프리뷰가 **꽉 차서** 표시됨.
- **Remove from stage** 후 다시 **Add to stage** 하면: 비율이 **데스크탑 프레임**(letterbox)처럼 조정되어 보임.

## 원인

1. **캔버스 조건부 렌더링**  
   `PreviewArea`는 `hasSources`(스테이지 소스 유무)에 따라 **캔버스** 또는 **플레이스홀더**를 렌더링함.
   - 소스 있음 → `<canvas>`
   - 소스 없음 → 플레이스홀더 div (카메라 아이콘 + 문구)

2. **Remove from stage 시**  
   `displaySources`가 `[]`가 되면서 `hasSources`가 false → **캔버스가 DOM에서 제거**되고 플레이스홀더만 남음.

3. **Add to stage 다시 할 때**  
   `displaySources`에 소스가 다시 들어오면 **캔버스가 다시 마운트**됨.  
   이때 `useCanvasPreview`의 effect에서 `updateCanvasSize()`가 **즉시** 호출됨.

4. **레이아웃 타이밍**  
   effect는 커밋 직후 동기적으로 실행되므로, 그 시점에는 **아직 새 캔버스 기준으로 레이아웃이 끝나지 않은 상태**일 수 있음.  
   그 결과 `container.getBoundingClientRect()`가 **플레이스홀더가 보이던 시점의 컨테이너 크기**를 반환함.
   - 플레이스홀더는 `flex flex-col items-center justify-center` 등으로 **콘텐츠 기준** 레이아웃.
   - 캔버스는 `w-full h-full object-contain`으로 **부모 전체**를 채움.
   - 따라서 같은 컨테이너라도 **자식이 플레이스홀더일 때와 캔버스일 때** flex 영역의 계산 결과가 달라질 수 있고, **캔버스가 막 마운트된 직후**에는 이전(플레이스홀더) 레이아웃의 크기가 쓰일 수 있음.

5. **잘못된 캔버스 크기**  
   그렇게 잡힌 크기로 `canvas.width` / `canvas.height`가 설정되면,  
   이후 실제 레이아웃이 바뀌어도 **캔버스 내부 해상도는 그대로**라서,  
   `object-contain` 때문에 **컨테이너와 캔버스 비율이 어긋나 letterbox(데스크탑 프레임처럼 보이는 현상)** 가 생김.

## 조치 (해결)

**캔버스가 마운트된 뒤, 레이아웃이 적용된 시점에서 한 번 더 크기를 갱신**하도록 함.

- `useCanvasPreview`의 resize effect에서:
  - `sources.length > 0`이고 캔버스 부모가 있을 때,
  - `requestAnimationFrame`을 **두 번** 사용해 **다음 페인트 이후**(레이아웃 반영 후)에 `updateCanvasSize()`를 한 번 더 호출.
- 이렇게 하면 “다시 올릴 때”에도 **올바른 컨테이너 크기**로 `canvas.width`/`height`가 설정되어, 최초 올릴 때와 동일하게 **꽉 차는** 비율로 보이게 됨.

## 요약

| 구분 | 내용 |
|------|------|
| **원인** | 스테이지 소스 제거 → 캔버스 언마운트 → 다시 추가 시 캔버스 재마운트 직후에 `getBoundingClientRect()`가 호출되어, **이전(플레이스홀더) 레이아웃의 크기**가 쓰임. |
| **결과** | 캔버스 내부 해상도가 잘못된 비율로 고정되고, `object-contain` 때문에 letterbox(데스크탑 프레임처럼 보이는 현상) 발생. |
| **해결** | 캔버스 마운트 후 **double rAF**로 레이아웃 적용 뒤 `updateCanvasSize()` 한 번 더 실행. |
