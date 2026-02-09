/**
 * OffscreenCanvas 지원 유틸리티
 * 향후 Web Worker에서 렌더링을 수행할 수 있도록 구조화
 */

/**
 * OffscreenCanvas 지원 여부 확인
 */
export function isOffscreenCanvasSupported(): boolean {
  return typeof OffscreenCanvas !== "undefined";
}

/**
 * Canvas를 OffscreenCanvas로 변환
 * @param canvas 원본 Canvas
 * @returns OffscreenCanvas 또는 null (미지원 시)
 */
export function createOffscreenCanvas(
  canvas: HTMLCanvasElement,
): OffscreenCanvas | null {
  if (!isOffscreenCanvasSupported()) {
    return null;
  }

  try {
    return canvas.transferControlToOffscreen();
  } catch (error) {
    console.warn("OffscreenCanvas 변환 실패:", error);
    return null;
  }
}

/**
 * OffscreenCanvas 렌더링 워커 생성 (향후 구현)
 * 
 * @example
 * ```typescript
 * const worker = new Worker('/workers/canvas-renderer.worker.js');
 * const offscreen = createOffscreenCanvas(canvas);
 * if (offscreen) {
 *   worker.postMessage({ canvas: offscreen }, [offscreen]);
 * }
 * ```
 */
export function createCanvasRendererWorker(): Worker | null {
  if (typeof Worker === "undefined") {
    return null;
  }

  // 향후 구현: Web Worker에서 렌더링 수행
  // 현재는 메인 스레드에서 렌더링
  return null;
}

/**
 * OffscreenCanvas 렌더링 옵션
 */
export interface OffscreenRenderOptions {
  useWorker?: boolean;
  workerPath?: string;
}

/**
 * OffscreenCanvas 사용 여부 결정
 * 성능 최적화가 필요한 경우에만 사용
 */
export function shouldUseOffscreenCanvas(
  sourceCount: number,
  canvasWidth: number,
  canvasHeight: number,
): boolean {
  // 소스가 많거나 해상도가 높은 경우 OffscreenCanvas 고려
  const pixelCount = canvasWidth * canvasHeight;
  const threshold = 1920 * 1080; // Full HD 기준

  return sourceCount > 4 || pixelCount > threshold;
}
