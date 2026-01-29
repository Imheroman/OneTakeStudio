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
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  /** 편집 모드: false면 라이브 모드(잠금). 향후 스테이징 드래그/리사이즈 비활성화에 사용 */
  isEditMode?: boolean;
  /** 로컬 녹화 시 캔버스 스트림을 가져오는 함수를 설정합니다. */
  getPreviewStreamRef?: GetPreviewStreamRef | null;
}

export function PreviewArea({
  className,
  layout = "full",
  sources = [],
  isVideoEnabled = true,
  isAudioEnabled = true,
  isEditMode = true,
  getPreviewStreamRef,
}: PreviewAreaProps) {
  const { canvasRef, registerSourceElement, unregisterSourceElement, getCaptureStream } =
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
          // Just-in-Time: 소스 추가 시점에만 웹캠 권한 요청. deviceId로 이전 선택 장치 사용
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: source.deviceId
                  ? { ideal: source.deviceId }
                  : undefined,
                width: { ideal: 1920, min: 640 },
                height: { ideal: 1080, min: 480 },
                frameRate: { ideal: 30 },
              },
              audio: isAudioEnabled,
            });

            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
              const settings = videoTrack.getSettings();
              if (settings.deviceId)
                setPreferredVideoDeviceId(settings.deviceId);
            }

            streamsMap.set(source.id, stream);

            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = () => {
              video.play().catch((error) => {
                console.error("비디오 재생 실패:", error);
              });
              registerSourceElement(source.id, video, stream);
            };

            video.onerror = (error) => {
              console.error("비디오 로드 실패:", error);
              stream.getTracks().forEach((track) => track.stop());
              streamsMap.delete(source.id);
            };
          } catch (error) {
            console.error("웹캠 접근 실패:", error);
            if (error instanceof Error) {
              if (error.name === "NotAllowedError") {
                console.warn("웹캠 권한이 거부되었습니다.");
              } else if (error.name === "NotFoundError") {
                console.warn("웹캠을 찾을 수 없습니다.");
              }
            }
          }
        } else if (source.type === "audio") {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: source.deviceId
                ? { deviceId: { ideal: source.deviceId } }
                : true,
            });
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
              const settings = audioTrack.getSettings();
              if (settings.deviceId)
                setPreferredAudioDeviceId(settings.deviceId);
            }
            streamsMap.set(source.id, stream);
            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            video.onloadedmetadata = () => {
              registerSourceElement(source.id, video, stream);
            };
          } catch (error) {
            console.error("마이크 접근 실패:", error);
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
          "absolute top-2 left-2 z-10 px-2 py-1 rounded text-xs font-semibold",
          isEditMode
            ? "bg-amber-500/90 text-amber-950"
            : "bg-red-600 text-white",
        )}
      >
        {isEditMode ? "스테이징" : "Live"}
      </span>
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
