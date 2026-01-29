"use client";

import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import { Stage, Layer, Group, Image, Rect, Text, Transformer } from "react-konva";
import Konva from "konva";
import { Camera } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { LayoutType, Source } from "@/entities/studio/model";
import type { GetPreviewStreamRef, SourceTransform } from "@/features/studio/studio-main";
import { arrangeSourcesInLayout } from "@/shared/lib/canvas";
import {
  setPreferredVideoDeviceId,
  setPreferredAudioDeviceId,
} from "@/shared/lib/device-preferences";

export type PreviewResolution = "720p" | "1080p";

const RESOLUTION_SIZE: Record<PreviewResolution, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
};

const SNAP_GRID = 8;
const SNAP_THRESHOLD = 8;

function snapToGrid(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

function snapPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  stageWidth: number,
  stageHeight: number,
): { x: number; y: number } {
  let nx = x;
  let ny = y;
  if (Math.abs(x) <= SNAP_THRESHOLD) nx = 0;
  else if (Math.abs(x + width - stageWidth) <= SNAP_THRESHOLD) nx = stageWidth - width;
  else if (Math.abs(x + width / 2 - stageWidth / 2) <= SNAP_THRESHOLD) nx = stageWidth / 2 - width / 2;
  else nx = snapToGrid(x, SNAP_GRID);

  if (Math.abs(y) <= SNAP_THRESHOLD) ny = 0;
  else if (Math.abs(y + height - stageHeight) <= SNAP_THRESHOLD) ny = stageHeight - height;
  else if (Math.abs(y + height / 2 - stageHeight / 2) <= SNAP_THRESHOLD) ny = stageHeight / 2 - height / 2;
  else ny = snapToGrid(y, SNAP_GRID);

  return { x: nx, y: ny };
}

function snapSize(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.max(1, snapToGrid(width, SNAP_GRID)),
    height: Math.max(1, snapToGrid(height, SNAP_GRID)),
  };
}

interface PreviewAreaProps {
  className?: string;
  layout?: LayoutType;
  sources?: Source[];
  availableStreamIds?: string[];
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  isEditMode?: boolean;
  resolution?: PreviewResolution;
  getSourceStream?: (sourceId: string) => MediaStream | undefined;
  getPreviewStreamRef?: GetPreviewStreamRef | null;
  sourceTransforms?: Record<string, SourceTransform>;
  setSourceTransform?: (sourceId: string, partial: Partial<SourceTransform>) => void;
  onBringSourceToFront?: (sourceId: string) => void;
}

/** 비디오/화면 소스: Konva Image에 비디오를 매 프레임 그리기 */
function VideoSourceNode({
  sourceId,
  video,
  x,
  y,
  width,
  height,
  layerRef,
  isVisible,
}: {
  sourceId: string;
  video: HTMLVideoElement;
  x: number;
  y: number;
  width: number;
  height: number;
  layerRef: React.RefObject<Konva.Layer | null>;
  isVisible: boolean;
}) {
  const imageRef = useRef<Konva.Image>(null);

  useLayoutEffect(() => {
    if (!video || !layerRef.current || !isVisible) return;
    let rafId: number;

    const tick = () => {
      const img = imageRef.current;
      if (img && video.readyState >= 2) {
        img.image(video);
        layerRef.current?.batchDraw();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [video, layerRef, isVisible]);

  if (!isVisible) return null;
  return (
    <Image
      ref={imageRef}
      image={video}
      x={x}
      y={y}
      width={width}
      height={height}
      listening={true}
    />
  );
}

export function PreviewArea({
  className,
  layout = "full",
  sources = [],
  availableStreamIds = [],
  isVideoEnabled = true,
  isAudioEnabled = true,
  isEditMode = true,
  resolution = "720p",
  getSourceStream,
  getPreviewStreamRef,
  sourceTransforms = {},
  setSourceTransform,
  onBringSourceToFront,
}: PreviewAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());
  const trRef = useRef<Konva.Transformer>(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sourceElements, setSourceElements] = useState<
    Map<string, HTMLVideoElement | HTMLImageElement>
  >(new Map());

  const { width: stageWidth, height: stageHeight } = RESOLUTION_SIZE[resolution];
  const scale =
    containerSize.width > 0 && containerSize.height > 0
      ? Math.min(containerSize.width / stageWidth, containerSize.height / stageHeight)
      : 1;

  const displaySources = sources.filter((s) => s.isVisible);
  /** 1=맨 앞(상단), 숫자 커질수록 뒤: 낮은 zIndex 먼저 그려서 높은 zIndex가 위에 오도록 */
  const sortedSources = [...displaySources].sort(
    (a, b) => (sourceTransforms[a.id]?.zIndex ?? 0) - (sourceTransforms[b.id]?.zIndex ?? 0),
  );
  const arranged = arrangeSourcesInLayout(
    layout,
    sortedSources.map((s, i) => ({ source: s, index: i })),
    stageWidth,
    stageHeight,
  );

  const getTransform = useCallback(
    (sourceId: string, index: number) => {
      const t = sourceTransforms[sourceId];
      const cell = arranged[index];
      if (t && t.width > 0 && t.height > 0) return t;
      if (cell)
        return {
          x: cell.x,
          y: cell.y,
          width: cell.width,
          height: cell.height,
          zIndex: index,
        };
      return { x: 0, y: 0, width: stageWidth, height: stageHeight, zIndex: index };
    },
    [sourceTransforms, arranged, stageWidth, stageHeight],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setContainerSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (selectedId) {
      const node = nodeRefs.current.get(selectedId);
      trRef.current?.nodes(node ? [node] : []);
      layerRef.current?.batchDraw();
    } else {
      trRef.current?.nodes([]);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!getPreviewStreamRef) return;
    getPreviewStreamRef.current = () => {
      const layer = layerRef.current;
      if (!layer) return null;
      const canvas = (layer.getCanvas() as { _canvas?: HTMLCanvasElement })?._canvas;
      return canvas?.captureStream?.(30) ?? null;
    };
    return () => {
      getPreviewStreamRef.current = null;
    };
  }, [getPreviewStreamRef]);

  const streamsMap = useRef<Map<string, MediaStream>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setSourceElements(new Map());

    const addElement = (sourceId: string, element: HTMLVideoElement | HTMLImageElement) => {
      if (cancelled) return;
      setSourceElements((prev) => new Map(prev).set(sourceId, element));
    };

    const setupSources = async () => {
      for (const source of sources) {
        if (cancelled) return;
        if (source.type === "image") {
          const img = document.createElement("img");
          img.crossOrigin = "anonymous";
          img.src = `https://picsum.photos/800/600?random=${source.id}`;
          img.onload = () => addElement(source.id, img);
          img.onerror = () => console.warn(`이미지 로드 실패: ${source.name}`);
        } else if (source.type === "video" || source.type === "screen") {
          let stream: MediaStream | null = null;
          if (typeof getSourceStream === "function") {
            stream = getSourceStream(source.id) ?? null;
          }
          if (!stream && typeof getSourceStream !== "function" && source.type === "video") {
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
              if (cancelled) {
                stream.getTracks().forEach((t) => t.stop());
                return;
              }
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack?.getSettings().deviceId)
                setPreferredVideoDeviceId(videoTrack.getSettings().deviceId!);
              streamsMap.current.set(source.id, stream);
            } catch (error) {
              console.error("웹캠 접근 실패:", error);
              continue;
            }
          }
          if (stream && !cancelled) {
            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            video.onloadedmetadata = () => {
              if (!cancelled) {
                video.play().catch(() => {});
                addElement(source.id, video);
              }
            };
            video.onerror = () => {
              if (typeof getSourceStream !== "function") {
                stream!.getTracks().forEach((t) => t.stop());
                streamsMap.current.delete(source.id);
              }
            };
          }
        } else if (source.type === "audio") {
          let stream: MediaStream | null = null;
          if (typeof getSourceStream === "function") {
            stream = getSourceStream(source.id) ?? null;
          }
          if (!stream && typeof getSourceStream !== "function") {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: source.deviceId ? { deviceId: { ideal: source.deviceId } } : true,
              });
              if (cancelled) {
                stream.getTracks().forEach((t) => t.stop());
                return;
              }
              const audioTrack = stream.getAudioTracks()[0];
              if (audioTrack?.getSettings().deviceId)
                setPreferredAudioDeviceId(audioTrack.getSettings().deviceId!);
              streamsMap.current.set(source.id, stream);
            } catch (error) {
              console.error("마이크 접근 실패:", error);
              continue;
            }
          }
          if (stream && !cancelled) {
            const video = document.createElement("video");
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            video.onloadedmetadata = () => {
              if (!cancelled) addElement(source.id, video);
            };
          }
        }
      }
    };

    setupSources();

    return () => {
      cancelled = true;
      streamsMap.current.forEach((stream) =>
        stream.getTracks().forEach((t) => t.stop()),
      );
      streamsMap.current.clear();
    };
  }, [sources, availableStreamIds, isAudioEnabled, getSourceStream]);

  const hasSources = sources.length > 0 && sources.some((s) => s.isVisible);

  if (!hasSources) {
    return (
      <div
        className={cn(
          "bg-black rounded-lg border border-gray-700 h-full w-full relative overflow-hidden flex flex-col items-center justify-center text-gray-500",
          className,
        )}
      >
        <span
          className={cn(
            "absolute top-2 left-2 z-10 px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide",
            isEditMode ? "bg-amber-500/90 text-amber-950" : "bg-red-600 text-white",
          )}
        >
          {isEditMode ? resolution : `Live ${resolution}`}
        </span>
        <Camera className="h-14 w-14 text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-400">프리뷰 영역</p>
        <p className="text-xs mt-1">소스를 추가하면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-black rounded-lg border border-gray-700 h-full w-full relative overflow-hidden",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-2 left-2 z-10 px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide",
          isEditMode ? "bg-amber-500/90 text-amber-950" : "bg-red-600 text-white",
        )}
      >
        {isEditMode ? resolution : `Live ${resolution}`}
      </span>
      <div
        style={{
          width: stageWidth * scale,
          height: stageHeight * scale,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        className="absolute inset-0 m-auto"
      >
        <div
          style={{
            width: stageWidth,
            height: stageHeight,
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <Stage
            ref={stageRef}
            width={stageWidth}
            height={stageHeight}
            onClick={(e) => {
              const stage = e.target.getStage();
              const layer = layerRef.current;
              let node: Konva.Node | null = e.target;
              while (node && node.getParent() !== layer) node = node.getParent();
              const group = node?.getClassName() === "Group" ? node : null;
              const id = group?.id();
              if (!id || !sortedSources.some((s) => s.id === id)) {
                setSelectedId(null);
                return;
              }
              setSelectedId(id);
              if (isEditMode && onBringSourceToFront) {
                onBringSourceToFront(id);
              }
            }}
          >
            <Layer ref={layerRef}>
              <Rect x={0} y={0} width={stageWidth} height={stageHeight} fill="black" />
              {!isVideoEnabled && (
                <Rect
                  x={0}
                  y={0}
                  width={stageWidth}
                  height={stageHeight}
                  fill="#1a1a1a"
                  listening={false}
                />
              )}
              {sortedSources.map((source, index) => {
                const transform = getTransform(source.id, index);
                const el = sourceElements.get(source.id);
                return (
                  <Group
                    key={source.id}
                    id={source.id}
                    ref={(node) => {
                      if (node) nodeRefs.current.set(source.id, node);
                    }}
                    x={transform.x}
                    y={transform.y}
                    draggable={isEditMode}
                    onDragEnd={(e) => {
                      const node = e.target;
                      const tx = node.x();
                      const ty = node.y();
                      const snapped = snapPosition(
                        tx,
                        ty,
                        transform.width,
                        transform.height,
                        stageWidth,
                        stageHeight,
                      );
                      setSourceTransform?.(source.id, { x: snapped.x, y: snapped.y });
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target as Konva.Group;
                      const rect = node.getClientRect();
                      const snappedPos = snapPosition(
                        rect.x,
                        rect.y,
                        rect.width,
                        rect.height,
                        stageWidth,
                        stageHeight,
                      );
                      const snappedSize = snapSize(rect.width, rect.height);
                      setSourceTransform?.(source.id, {
                        x: snappedPos.x,
                        y: snappedPos.y,
                        width: snappedSize.width,
                        height: snappedSize.height,
                      });
                      node.scaleX(1);
                      node.scaleY(1);
                      node.position({ x: snappedPos.x, y: snappedPos.y });
                      node.getChildren().forEach((child) => {
                        child.width(snappedSize.width);
                        child.height(snappedSize.height);
                      });
                    }}
                  >
                    {source.type === "video" || source.type === "screen" ? (
                      el && el instanceof HTMLVideoElement ? (
                        <VideoSourceNode
                          sourceId={source.id}
                          video={el}
                          x={0}
                          y={0}
                          width={transform.width}
                          height={transform.height}
                          layerRef={layerRef}
                          isVisible={source.isVisible}
                        />
                      ) : (
                        <Rect
                          width={transform.width}
                          height={transform.height}
                          fill="#1a1a1a"
                          stroke="#333"
                          strokeWidth={2}
                        />
                      )
                    ) : source.type === "image" ? (
                      el && el instanceof HTMLImageElement ? (
                        <Image
                          image={el}
                          width={transform.width}
                          height={transform.height}
                          listening={true}
                        />
                      ) : (
                        <Rect
                          width={transform.width}
                          height={transform.height}
                          fill="#1a1a1a"
                          stroke="#333"
                          strokeWidth={2}
                        />
                      )
                    ) : (
                      <Rect
                        width={transform.width}
                        height={transform.height}
                        fill="rgba(100,100,200,0.5)"
                        listening={true}
                      />
                    )}
                    {isEditMode && (
                      <>
                        <Rect
                          x={2}
                          y={2}
                          width={22}
                          height={20}
                          fill="rgba(0,0,0,0.7)"
                          listening={false}
                        />
                        <Text
                          x={6}
                          y={4}
                          text={String(sortedSources.length - index)}
                          fontSize={13}
                          fontFamily="Arial"
                          fill="white"
                          listening={false}
                        />
                      </>
                    )}
                  </Group>
                );
              })}
              {isEditMode && <Transformer ref={trRef} />}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
