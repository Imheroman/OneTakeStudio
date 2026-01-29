/**
 * 레이아웃 계산 유틸리티
 * 동적 그리드: 16:9 고정, 인원 수별 세분화 템플릿, 여백(Gutter)·정렬 일관
 */

import type { LayoutType, LayoutGrid } from "./types";

/** 셀 간 여백(px). 브랜딩 일관성·정렬 통일용 */
export const GRID_GUTTER = 8;

/**
 * 레이아웃 타입에 따른 그리드 정보 반환 (gutter 적용)
 */
export function getLayoutGrid(
  layout: LayoutType,
  canvasWidth: number,
  canvasHeight: number,
): LayoutGrid {
  const g = GRID_GUTTER;

  switch (layout) {
    case "full":
      return {
        rows: 1,
        cols: 1,
        cells: [
          { x: 0, y: 0, width: canvasWidth, height: canvasHeight },
        ],
      };

    case "split": {
      const cellW = (canvasWidth - g) / 2;
      return {
        rows: 1,
        cols: 2,
        cells: [
          { x: 0, y: 0, width: cellW, height: canvasHeight },
          { x: cellW + g, y: 0, width: cellW, height: canvasHeight },
        ],
      };
    }

    case "three-grid": {
      const cellW = (canvasWidth - g) / 2;
      const cellH = (canvasHeight - g) / 2;
      return {
        rows: 2,
        cols: 2,
        cells: [
          { x: 0, y: 0, width: cellW, height: cellH },
          { x: cellW + g, y: 0, width: cellW, height: cellH },
          { x: 0, y: cellH + g, width: cellW, height: cellH },
          { x: cellW + g, y: cellH + g, width: cellW, height: cellH },
        ],
      };
    }

    case "four-grid": {
      const cellW = (canvasWidth - g) / 2;
      const cellH = (canvasHeight - g) / 2;
      return {
        rows: 2,
        cols: 2,
        cells: [
          { x: 0, y: 0, width: cellW, height: cellH },
          { x: cellW + g, y: 0, width: cellW, height: cellH },
          { x: 0, y: cellH + g, width: cellW, height: cellH },
          { x: cellW + g, y: cellH + g, width: cellW, height: cellH },
        ],
      };
    }

    case "custom":
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
