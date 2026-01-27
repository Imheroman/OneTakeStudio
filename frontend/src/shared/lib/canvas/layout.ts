/**
 * 레이아웃 계산 유틸리티
 * 다양한 레이아웃 타입에 따른 그리드 계산
 */

import type { LayoutType, LayoutGrid } from "./types";

/**
 * 레이아웃 타입에 따른 그리드 정보 반환
 */
export function getLayoutGrid(
  layout: LayoutType,
  canvasWidth: number,
  canvasHeight: number,
): LayoutGrid {
  switch (layout) {
    case "full":
      return {
        rows: 1,
        cols: 1,
        cells: [
          {
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
          },
        ],
      };

    case "split":
      return {
        rows: 1,
        cols: 2,
        cells: [
          {
            x: 0,
            y: 0,
            width: canvasWidth / 2,
            height: canvasHeight,
          },
          {
            x: canvasWidth / 2,
            y: 0,
            width: canvasWidth / 2,
            height: canvasHeight,
          },
        ],
      };

    case "three-grid":
      return {
        rows: 2,
        cols: 2,
        cells: [
          // 큰 셀 (왼쪽 상단, 2x2)
          {
            x: 0,
            y: 0,
            width: canvasWidth / 2,
            height: canvasHeight / 2,
          },
          // 오른쪽 상단
          {
            x: canvasWidth / 2,
            y: 0,
            width: canvasWidth / 2,
            height: canvasHeight / 2,
          },
          // 왼쪽 하단
          {
            x: 0,
            y: canvasHeight / 2,
            width: canvasWidth / 2,
            height: canvasHeight / 2,
          },
          // 오른쪽 하단
          {
            x: canvasWidth / 2,
            y: canvasHeight / 2,
            width: canvasWidth / 2,
            height: canvasHeight / 2,
          },
        ],
      };

    case "four-grid":
      return {
        rows: 2,
        cols: 2,
        cells: [
          // 상단 왼쪽
          {
            x: 0,
            y: 0,
            width: canvasWidth / 2,
            height: canvasHeight / 2,
          },
          // 상단 오른쪽
          {
            x: canvasWidth / 2,
            y: 0,
            width: canvasWidth / 2,
            height: canvasHeight / 2,
          },
          // 하단 왼쪽
          {
            x: 0,
            y: canvasHeight / 2,
            width: canvasWidth / 2,
            height: canvasHeight / 2,
          },
          // 하단 오른쪽
          {
            x: canvasWidth / 2,
            y: canvasHeight / 2,
            width: canvasWidth / 2,
            height: canvasHeight / 2,
          },
        ],
      };

    case "custom":
      // 커스텀 레이아웃은 기본적으로 full과 동일
      return getLayoutGrid("full", canvasWidth, canvasHeight);

    default:
      return getLayoutGrid("full", canvasWidth, canvasHeight);
  }
}

/**
 * 소스들을 레이아웃에 맞게 배치
 */
export function arrangeSourcesInLayout(
  layout: LayoutType,
  sources: Array<{ source: any; index: number }>,
  canvasWidth: number,
  canvasHeight: number,
): Array<{
  source: any;
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const grid = getLayoutGrid(layout, canvasWidth, canvasHeight);
  const visibleSources = sources.filter((s) => s.source.isVisible);

  return visibleSources.map((item, index) => {
    const cellIndex = Math.min(index, grid.cells.length - 1);
    const cell = grid.cells[cellIndex];

    return {
      source: item.source,
      x: cell.x,
      y: cell.y,
      width: cell.width,
      height: cell.height,
    };
  });
}
