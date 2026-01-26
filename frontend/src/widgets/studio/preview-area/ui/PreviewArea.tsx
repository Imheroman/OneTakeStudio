"use client";

import { useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useCanvasPreview } from "@/hooks/studio/useCanvasPreview";
import type { LayoutType, Source } from "@/entities/studio/model";

interface PreviewAreaProps {
  className?: string;
  layout?: LayoutType;
  sources?: Source[];
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
}

export function PreviewArea({
  className,
  layout = "full",
  sources = [],
  isVideoEnabled = true,
  isAudioEnabled = true,
}: PreviewAreaProps) {
  const { canvasRef, registerSourceElement, unregisterSourceElement } =
    useCanvasPreview({
      layout,
      sources,
      isVideoEnabled,
      isAudioEnabled,
    });

  // 소스 엘리먼트 등록/해제
  useEffect(() => {
    sources.forEach((source) => {
      if (source.type === "image") {
        // 이미지 소스 테스트용 (개발 환경)
        const img = new Image();
        img.crossOrigin = "anonymous";
        // 테스트용 이미지 URL (실제로는 소스에서 가져와야 함)
        img.src = `https://picsum.photos/800/600?random=${source.id}`;
        img.onload = () => {
          registerSourceElement(source.id, img);
        };
        img.onerror = () => {
          console.warn(`이미지 로드 실패: ${source.name}`);
        };
      } else if (source.type === "video") {
        // 비디오 소스의 경우 MediaStream 가져오기
        // 실제 구현에서는 getUserMedia 또는 다른 소스에서 가져옴
        // 현재는 플레이스홀더만 표시
      }
      // text, audio, browser 타입은 렌더러에서 처리
    });

    return () => {
      sources.forEach((source) => {
        unregisterSourceElement(source.id);
      });
    };
  }, [sources, registerSourceElement, unregisterSourceElement]);

  const hasSources = sources.length > 0 && sources.some((s) => s.isVisible);

  return (
    <div
      className={cn(
        "bg-black rounded-lg border border-gray-700 h-full w-full relative overflow-hidden",
        className,
      )}
    >
      {hasSources ? (
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{ display: "block" }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full w-full">
          <Camera className="h-16 w-16 text-gray-700 mb-4" />
          <p className="text-gray-400 font-medium mb-2">Preview Area</p>
          <p className="text-gray-500 text-sm">
            Your stream preview will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
