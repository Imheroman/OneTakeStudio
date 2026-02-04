/**
 * 3-Stage System: Coordinate Normalization for Virtual Canvas
 *
 * - Backstage: Source Pool (리허설)
 * - UI Stage: Responsive Viewport (브라우저 창 비율 유지, 가변)
 * - Virtual Canvas Stage: 고정 해상도(1920×1080 기준), 실제 송출 프레임 생성
 *
 * 모든 소스 위치/크기는 픽셀이 아닌 'Virtual Canvas 대비 0~1 정규화 좌표'로 관리하면
 * UI Stage 크기가 바뀌어도 송출 해상도·비율이 일관되게 유지된다.
 */

/** Virtual Canvas 기준 해상도 (정규화의 1.0 = 이 픽셀) */
export const VIRTUAL_CANVAS_REFERENCE = {
  width: 1920,
  height: 1080,
} as const;

/** 해상도별 Virtual Canvas 크기 (UI Stage / 캡처 Stage 공통) */
export const RESOLUTION_SIZES = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
} as const;

/** 정규화된 좌표/크기 (0~1). Virtual Canvas 대비 비율. */
export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 정규화된 소스 변환 (zIndex는 픽셀 독립) */
export interface NormalizedTransform extends NormalizedBox {
  zIndex: number;
}

/** 픽셀 단위 소스 변환 (기존 SourceTransform 호환) */
export interface PixelTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * 정규화(0~1) → 픽셀 변환.
 * Virtual Canvas(또는 UI Stage)의 실제 width/height로 스케일.
 * 정규화 좌표가 0~1 범위를 벗어나도 clamp하여 항상 가시 영역 내에 위치하도록 함.
 */
export function toPixelTransform(
  normalized: NormalizedTransform,
  canvasWidth: number,
  canvasHeight: number
): PixelTransform {
  const x = clamp01(normalized.x) * canvasWidth;
  const y = clamp01(normalized.y) * canvasHeight;
  const width = clamp01(normalized.width) * canvasWidth;
  const height = clamp01(normalized.height) * canvasHeight;
  // x + width가 canvasWidth를 초과하지 않도록, y + height가 canvasHeight를 초과하지 않도록 clamp
  const clampedX = Math.min(x, canvasWidth - width);
  const clampedY = Math.min(y, canvasHeight - height);
  return {
    x: Math.max(0, clampedX),
    y: Math.max(0, clampedY),
    width: Math.min(width, canvasWidth),
    height: Math.min(height, canvasHeight),
    zIndex: normalized.zIndex,
  };
}

/**
 * 픽셀 → 정규화(0~1) 변환.
 * 동일한 canvas width/height 기준으로 비율 계산.
 */
export function toNormalizedTransform(
  pixel: PixelTransform,
  canvasWidth: number,
  canvasHeight: number
): NormalizedTransform {
  const w = Math.max(1, canvasWidth);
  const h = Math.max(1, canvasHeight);
  return {
    x: clamp01(pixel.x / w),
    y: clamp01(pixel.y / h),
    width: clamp01(pixel.width / w),
    height: clamp01(pixel.height / h),
    zIndex: pixel.zIndex,
  };
}

/**
 * 정규화 박스만 픽셀으로 (zIndex 없음)
 * 정규화 좌표가 0~1 범위를 벗어나도 clamp하여 항상 가시 영역 내에 위치하도록 함.
 */
export function normalizedBoxToPixel(
  box: NormalizedBox,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  const x = clamp01(box.x) * canvasWidth;
  const y = clamp01(box.y) * canvasHeight;
  const width = clamp01(box.width) * canvasWidth;
  const height = clamp01(box.height) * canvasHeight;
  const clampedX = Math.min(x, canvasWidth - width);
  const clampedY = Math.min(y, canvasHeight - height);
  return {
    x: Math.max(0, clampedX),
    y: Math.max(0, clampedY),
    width: Math.min(width, canvasWidth),
    height: Math.min(height, canvasHeight),
  };
}

/**
 * 픽셀 박스 → 정규화(0~1)
 */
export function pixelBoxToNormalized(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
): NormalizedBox {
  const w = Math.max(1, canvasWidth);
  const h = Math.max(1, canvasHeight);
  return {
    x: clamp01(x / w),
    y: clamp01(y / h),
    width: clamp01(width / w),
    height: clamp01(height / h),
  };
}
