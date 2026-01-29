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

  const render = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isVideoEnabled) {
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

    const visibleSources = sources.filter((s) => s.isVisible);
    const arrangedSources = arrangeSourcesInLayout(
      layout,
      visibleSources.map((source, index) => ({ source, index })),
      canvas.width,
      canvas.height,
    );

    arrangedSources.forEach((arranged) => {
      const sourceData = sourceElementsRef.current.get(arranged.source.id);
      if (!sourceData || sourceData.element == null) return;
      // 매 프레임 sources + sourceElementsRef 기준으로 그림. 재등록 소스는 PreviewArea가 registerSourceElement 호출한 뒤 다음 프레임부터 자동 반영됨

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

    animationFrameRef.current = requestAnimationFrame(render);
  }, [layout, sources, isVideoEnabled, isAudioEnabled]);

  useEffect(() => {
    updateCanvasSize();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    const el = canvasRef.current?.parentElement;
    if (el) {
      resizeObserver.observe(el);
    }

    let rafId: number | undefined;
    if (sources.length > 0 && canvasRef.current?.parentElement) {
      rafId = requestAnimationFrame(() => {
        requestAnimationFrame(updateCanvasSize);
      });
    }

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [updateCanvasSize, sources.length]);

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
