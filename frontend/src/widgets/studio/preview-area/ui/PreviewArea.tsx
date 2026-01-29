"use client";

import { useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useCanvasPreview } from "@/hooks/studio/useCanvasPreview";
import type { LayoutType, Source } from "@/entities/studio/model";
import type { GetPreviewStreamRef } from "@/features/studio/studio-main";
import {
  setPreferredVideoDeviceId,
  setPreferredAudioDeviceId,
} from "@/shared/lib/device-preferences";

interface PreviewAreaProps {
  className?: string;
  layout?: LayoutType;
  sources?: Source[];
  /** 스트림이 준비된 소스 ID 목록. 변경 시 effect 재실행해 새 스트림을 캔버스에 반영 */
  availableStreamIds?: string[];
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  /** 편집 모드: false면 라이브 모드(잠금). 향후 스테이징 드래그/리사이즈 비활성화에 사용 */
  isEditMode?: boolean;
  /** 소스별 공유 스트림(useSourceStreams). 있으면 내부에서 getUserMedia 호출하지 않음. */
  getSourceStream?: (sourceId: string) => MediaStream | undefined;
  /** 로컬 녹화 시 캔버스 스트림을 가져오는 함수를 설정합니다. */
  getPreviewStreamRef?: GetPreviewStreamRef | null;
}

export function PreviewArea({
  className,
  layout = "full",
  sources = [],
  availableStreamIds = [],
  isVideoEnabled = true,
  isAudioEnabled = true,
  isEditMode = true,
  getSourceStream,
  getPreviewStreamRef,
}: PreviewAreaProps) {
  const { canvasRef, registerSourceElement, unregisterSourceElement, getCaptureStream } =
    useCanvasPreview({
      layout,
      sources,
      isVideoEnabled,
      isAudioEnabled,
    });

  // 소스 엘리먼트 등록/해제 (getSourceStream 있으면 공유 스트림 사용 → 트랙 중복 방지)
  useEffect(() => {
    const streamsMap = new Map<string, MediaStream>();
    const useSharedStreams = typeof getSourceStream === "function";

    const setupSources = async () => {
      for (const source of sources) {
        if (source.type === "image") {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = `https://picsum.photos/800/600?random=${source.id}`;
          img.onload = () => registerSourceElement(source.id, img);
          img.onerror = () => console.warn(`이미지 로드 실패: ${source.name}`);
        } else if (source.type === "video") {
          let stream: MediaStream | null = null;
          if (useSharedStreams) {
            stream = getSourceStream(source.id) ?? null;
          }
          if (!stream && !useSharedStreams) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  deviceId: source.deviceId ? { ideal: source.deviceId } : undefined,
                  width: { ideal: 1920, min: 640 },
                  height: { ideal: 1080, min: 480 },
                  frameRate: { ideal: 30 },
                },
                audio: isAudioEnabled,
              });
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack?.getSettings().deviceId)
                setPreferredVideoDeviceId(videoTrack.getSettings().deviceId!);
              streamsMap.set(source.id, stream);
            } catch (error) {
              console.error("웹캠 접근 실패:", error);
              continue;
            }
          }
          if (stream) {
            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            video.onloadedmetadata = () => {
              video.play().catch(() => {});
              registerSourceElement(source.id, video, stream!);
            };
            video.onerror = () => {
              if (!useSharedStreams) {
                stream!.getTracks().forEach((t) => t.stop());
                streamsMap.delete(source.id);
              }
            };
          }
        } else if (source.type === "audio") {
          let stream: MediaStream | null = null;
          if (useSharedStreams) {
            stream = getSourceStream(source.id) ?? null;
          }
          if (!stream && !useSharedStreams) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: source.deviceId ? { deviceId: { ideal: source.deviceId } } : true,
              });
              const audioTrack = stream.getAudioTracks()[0];
              if (audioTrack?.getSettings().deviceId)
                setPreferredAudioDeviceId(audioTrack.getSettings().deviceId!);
              streamsMap.set(source.id, stream);
            } catch (error) {
              console.error("마이크 접근 실패:", error);
              continue;
            }
          }
          if (stream) {
            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            video.onloadedmetadata = () => registerSourceElement(source.id, video, stream!);
          }
        }
      }
    };

    setupSources();

    return () => {
      if (!useSharedStreams) {
        streamsMap.forEach((stream) => stream.getTracks().forEach((t) => t.stop()));
        streamsMap.clear();
      }
      sources.forEach((source) => unregisterSourceElement(source.id));
    };
  }, [
    sources,
    availableStreamIds,
    registerSourceElement,
    unregisterSourceElement,
    isAudioEnabled,
    getSourceStream,
  ]);

  useEffect(() => {
    if (!getPreviewStreamRef) return;
    getPreviewStreamRef.current = () => getCaptureStream(30);
    return () => {
      getPreviewStreamRef.current = null;
    };
  }, [getPreviewStreamRef, getCaptureStream]);

  const hasSources = sources.length > 0 && sources.some((s) => s.isVisible);

  return (
    <div
      className={cn(
        "bg-black rounded-lg border border-gray-700 h-full w-full relative overflow-hidden",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-2 left-2 z-10 px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide",
          isEditMode
            ? "bg-amber-500/90 text-amber-950"
            : "bg-red-600 text-white",
        )}
      >
        {isEditMode ? "프리뷰" : "Live"}
      </span>
      {hasSources ? (
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{ display: "block" }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full w-full text-gray-500">
          <Camera className="h-14 w-14 text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-400">프리뷰 영역</p>
          <p className="text-xs mt-1">소스를 추가하면 여기에 표시됩니다.</p>
        </div>
      )}
    </div>
  );
}
