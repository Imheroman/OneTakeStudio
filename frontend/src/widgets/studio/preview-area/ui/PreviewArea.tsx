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
    const streamsMap = new Map<string, MediaStream>();

    const setupSources = async () => {
      for (const source of sources) {
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
          // 비디오 소스의 경우 웹캠 연결
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: isAudioEnabled,
            });

            streamsMap.set(source.id, stream);

            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;

            // 비디오가 로드되면 등록
            video.onloadedmetadata = () => {
              video.play().catch((error) => {
                console.error("비디오 재생 실패:", error);
              });
              registerSourceElement(source.id, video, stream);
            };

            video.onerror = (error) => {
              console.error("비디오 로드 실패:", error);
              // 스트림 정리
              stream.getTracks().forEach((track) => track.stop());
              streamsMap.delete(source.id);
            };
          } catch (error) {
            console.error("웹캠 접근 실패:", error);
            // 권한 거부 또는 기타 오류 처리
            if (error instanceof Error) {
              if (error.name === "NotAllowedError") {
                console.warn("웹캠 권한이 거부되었습니다.");
              } else if (error.name === "NotFoundError") {
                console.warn("웹캠을 찾을 수 없습니다.");
              }
            }
          }
        }
        // text, audio, browser 타입은 렌더러에서 처리
      }
    };

    setupSources();

    return () => {
      // 모든 스트림 정리
      streamsMap.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      streamsMap.clear();

      // 소스 엘리먼트 해제
      sources.forEach((source) => {
        unregisterSourceElement(source.id);
      });
    };
  }, [sources, registerSourceElement, unregisterSourceElement, isAudioEnabled]);

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
