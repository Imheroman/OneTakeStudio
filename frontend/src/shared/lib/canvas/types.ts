/**
 * Canvas 렌더링 관련 타입 정의
 * FSD: shared는 entities를 참조하지 않음 → canvas 전용 타입을 여기서 정의
 * (entities/studio의 LayoutType·Source·SourceType과 구조적으로 동일하여 호환)
 */

/** 레이아웃 타입 (entities/studio LayoutType과 동일 구조) */
export type LayoutType =
  | "full"
  | "split"
  | "three-grid"
  | "four-grid"
  | "custom";

/** 소스 타입 (entities/studio SourceType과 동일) */
export type SourceType = "video" | "audio" | "image" | "text" | "browser";

/** 소스 정보 (entities/studio Source와 동일 구조) */
export interface Source {
  id: string;
  type: SourceType;
  name: string;
  isVisible: boolean;
}

/**
 * 렌더링할 소스 정보
 */
export interface RenderSource {
  source: Source;
  element?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
  stream?: MediaStream;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

/**
 * 레이아웃 그리드 정보
 */
export interface LayoutGrid {
  rows: number;
  cols: number;
  cells: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

/**
 * Canvas 렌더링 옵션
 */
export interface CanvasRenderOptions {
  layout: LayoutType;
  sources: Source[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor?: string;
}

/**
 * 소스별 렌더링 컨텍스트
 */
export interface SourceRenderContext {
  source: {
    source: Source;
    element?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
    stream?: MediaStream;
  };
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
}
