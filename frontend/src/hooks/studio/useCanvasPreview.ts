/**
 * Canvas Preview 훅
 * 비디오 프리뷰를 위한 Canvas 렌더링 관리
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { LayoutType, Source } from "@/entities/studio/model";
import {
  arrangeSourcesInLayout,
  renderSourceByType,
  type SourceRenderContext,
} from "@/shared/lib/canvas";

interface UseCanvasPreviewOptions {
  layout: LayoutType;
  sources: Source[];
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

/**
 * Canvas를 사용한 비디오 프리뷰 훅
 */
export function useCanvasPreview({
  layout,
  sources,
  isVideoEnabled,
  isAudioEnabled,
}: UseCanvasPreviewOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const sourceElementsRef = useRef<
    Map<
      string,
      {
        element?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
        stream?: MediaStream;
      }
    >
  >(new Map());

  // Canvas 크기 업데이트
  const updateCanvasSize = useCallback(() => {
    if (!canvasRef.current) return;

    const container = canvasRef.current.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    if (canvasSize.width !== width || canvasSize.height !== height) {
      setCanvasSize({ width, height });
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    }
  }, [canvasSize]);

  // 소스 엘리먼트 관리
  const registerSourceElement = useCallback(
    (
      sourceId: string,
      element?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
      stream?: MediaStream,
    ) => {
      sourceElementsRef.current.set(sourceId, { element, stream });
    },
    [],
  );

  const unregisterSourceElement = useCallback((sourceId: string) => {
    sourceElementsRef.current.delete(sourceId);
  }, []);

  // 렌더링 루프
  const render = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas 초기화
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isVideoEnabled) {
      // 비디오가 비활성화된 경우
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#666666";
      ctx.font = "24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "비디오가 비활성화되었습니다",
        canvas.width / 2,
        canvas.height / 2,
      );
      return;
    }

    // 레이아웃에 맞게 소스 배치
    const visibleSources = sources.filter((s) => s.isVisible);
    const arrangedSources = arrangeSourcesInLayout(
      layout,
      visibleSources.map((source, index) => ({ source, index })),
      canvas.width,
      canvas.height,
    );

    // 각 소스 렌더링 (DOM/캔버스 동기화: 엘리먼트 미등록 시 스킵)
    arrangedSources.forEach((arranged) => {
      const sourceData = sourceElementsRef.current.get(arranged.source.id);
      if (!sourceData || sourceData.element == null) return;

      const renderContext: SourceRenderContext = {
        source: {
          source: arranged.source,
          element: sourceData.element,
          stream: sourceData.stream,
        },
        canvas,
        ctx,
        x: arranged.x,
        y: arranged.y,
        width: arranged.width,
        height: arranged.height,
      };

      renderSourceByType(renderContext);
    });

    // 다음 프레임 요청
    animationFrameRef.current = requestAnimationFrame(render);
  }, [layout, sources, isVideoEnabled, isAudioEnabled]);

  // Canvas 크기 조정 감지. sources.length 포함 → 소스 추가로 캔버스가 처음 마운트될 때 크기 갱신(스테이지 소스 미출력 버그 방지)
  useEffect(() => {
    updateCanvasSize();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    const el = canvasRef.current?.parentElement;
    if (el) {
      resizeObserver.observe(el);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateCanvasSize, sources.length]);

  // 렌더링 루프 시작/중지. 소스가 있는데 크기가 0이면 한 프레임 뒤에 크기 재측정(캔버스 첫 마운트 시 레이아웃 지연 대응)
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      animationFrameRef.current = requestAnimationFrame(render);
    } else if (sources.length > 0 && canvasRef.current?.parentElement) {
      const raf = requestAnimationFrame(() => {
        updateCanvasSize();
      });
      return () => cancelAnimationFrame(raf);
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render, canvasSize, sources.length, updateCanvasSize]);

  const getCaptureStream = useCallback((frameRate = 30): MediaStream | null => {
    if (!canvasRef.current) return null;
    try {
      return canvasRef.current.captureStream(frameRate) ?? null;
    } catch {
      return null;
    }
  }, []);

  return {
    canvasRef,
    registerSourceElement,
    unregisterSourceElement,
    getCaptureStream,
  };
}
