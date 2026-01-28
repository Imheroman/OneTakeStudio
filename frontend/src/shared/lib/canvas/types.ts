/**
 * Canvas 렌더링 관련 타입 정의
 */

import type { LayoutType, Source, SourceType } from "@/entities/studio/model";

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
