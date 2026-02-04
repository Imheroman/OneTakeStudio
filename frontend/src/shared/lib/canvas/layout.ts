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
  canvasHeight: number
): LayoutGrid {
  const g = GRID_GUTTER;

  switch (layout) {
    case "full":
      return {
        rows: 1,
        cols: 1,
        cells: [{ x: 0, y: 0, width: canvasWidth, height: canvasHeight }],
      };

    case "pip": {
      // 화면공유 전체 + 웹캠 우측 하단 작게 (PiP) - FE/fix/studio와 동일
      const pipW = Math.floor(canvasWidth / 6);
      const pipH = Math.floor(canvasHeight / 6);
      const margin = 16;
      return {
        rows: 1,
        cols: 2,
        cells: [
          { x: 0, y: 0, width: canvasWidth, height: canvasHeight },
          {
            x: canvasWidth - pipW - margin,
            y: canvasHeight - pipH - margin,
            width: pipW,
            height: pipH,
          },
        ],
      };
    }

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
 * full 레이아웃에서 소스가 2개 이상일 때 사용할 그리드
 * 2개: pip (화면공유 전체 + 웹캠 작게), 3개 이상: 그리드 분할
 */
function getEffectiveLayout(
  layout: LayoutType,
  visibleCount: number
): LayoutType {
  if (layout !== "full" || visibleCount <= 1) return layout;
  if (visibleCount === 2) return "pip";
  if (visibleCount === 3) return "three-grid";
  return "four-grid";
}

/**
 * 소스들을 레이아웃에 맞게 배치
 * full 레이아웃 + 소스 2개 시 pip (화면공유 전체 + 웹캠 우측 하단), 3개 이상 시 그리드 분할
 */
export function arrangeSourcesInLayout(
  layout: LayoutType,
  sources: Array<{ source: any; index: number }>,
  canvasWidth: number,
  canvasHeight: number
): Array<{
  source: any;
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const visibleSources = sources.filter((s) => s.source.isVisible);
  const effectiveLayout = getEffectiveLayout(layout, visibleSources.length);
  const grid = getLayoutGrid(effectiveLayout, canvasWidth, canvasHeight);

  // pip: 화면공유를 전체(cell 0), 웹캠을 우측 하단(cell 1)에 배치
  const orderedSources =
    effectiveLayout === "pip" && visibleSources.length === 2
      ? [...visibleSources].sort((a, b) => {
          const aIsScreen = a.source.type === "screen" ? 1 : 0;
          const bIsScreen = b.source.type === "screen" ? 1 : 0;
          return bIsScreen - aIsScreen; // screen 먼저 → 전체 화면
        })
      : visibleSources;

  return orderedSources.map((item, index) => {
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
