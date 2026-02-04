"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  Stage,
  Layer,
  Group,
  Image,
  Rect,
  Text,
  Transformer,
} from "react-konva";
import Konva from "konva";
import { Camera } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { LayoutType, Source } from "@/entities/studio/model";
import type {
  GetPreviewStreamRef,
  SourceTransform,
} from "@/features/studio/studio-main";
import {
  arrangeSourcesInLayout,
  computeSourceFitRect,
} from "@/shared/lib/canvas";
import type { SourceFitMode } from "@/shared/lib/canvas";
import {
  setPreferredVideoDeviceId,
  setPreferredAudioDeviceId,
} from "@/shared/lib/device-preferences";
import type { BannerItem } from "@/widgets/studio/studio-sidebar/panels/StudioBannerPanel";
import type { AssetItem } from "@/widgets/studio/studio-sidebar/panels/StudioAssetPanel";
import type { StudioStyleState } from "@/widgets/studio/studio-sidebar/panels/StudioStylePanel";

export type PreviewResolution = "720p" | "1080p";

const RESOLUTION_SIZE: Record<
  PreviewResolution,
  { width: number; height: number }
> = {
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
  stageHeight: number
): { x: number; y: number } {
  let nx = x;
  let ny = y;
  if (Math.abs(x) <= SNAP_THRESHOLD) nx = 0;
  else if (Math.abs(x + width - stageWidth) <= SNAP_THRESHOLD)
    nx = stageWidth - width;
  else if (Math.abs(x + width / 2 - stageWidth / 2) <= SNAP_THRESHOLD)
    nx = stageWidth / 2 - width / 2;
  else nx = snapToGrid(x, SNAP_GRID);

  if (Math.abs(y) <= SNAP_THRESHOLD) ny = 0;
  else if (Math.abs(y + height - stageHeight) <= SNAP_THRESHOLD)
    ny = stageHeight - height;
  else if (Math.abs(y + height / 2 - stageHeight / 2) <= SNAP_THRESHOLD)
    ny = stageHeight / 2 - height / 2;
  else ny = snapToGrid(y, SNAP_GRID);

  return { x: nx, y: ny };
}

function snapSize(
  width: number,
  height: number
): { width: number; height: number } {
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
  setSourceTransform?: (
    sourceId: string,
    partial: Partial<SourceTransform>
  ) => void;
  onBringSourceToFront?: (sourceId: string) => void;
  activeBanner?: BannerItem | null;
  activeAsset?: AssetItem | null;
  styleState?: StudioStyleState | null;
}

/** 비디오/화면 소스: Konva Image에 비디오를 매 프레임 그리기. scheduleBatchDraw로 프레임당 1회만 그리기 요청. */
function VideoSourceNode({
  sourceId,
  video,
  boxWidth,
  boxHeight,
  fit,
  scheduleBatchDraw,
  isVisible,
}: {
  sourceId: string;
  video: HTMLVideoElement;
  boxWidth: number;
  boxHeight: number;
  fit: SourceFitMode;
  scheduleBatchDraw: () => void;
  isVisible: boolean;
}) {
  const imageRef = useRef<Konva.Image>(null);
  const [sourceSize, setSourceSize] = useState({
    w: video.videoWidth || 0,
    h: video.videoHeight || 0,
  });

  useEffect(() => {
    if (!video) return;
    const sync = () => {
      const w = video.videoWidth || 0;
      const h = video.videoHeight || 0;
      if (w > 0 && h > 0) setSourceSize({ w, h });
    };
    sync();
    video.addEventListener("loadedmetadata", sync);
    video.addEventListener("loadeddata", sync);
    return () => {
      video.removeEventListener("loadedmetadata", sync);
      video.removeEventListener("loadeddata", sync);
    };
  }, [video]);

  const sourceW = sourceSize.w || boxWidth;
  const sourceH = sourceSize.h || boxHeight;
  const rect = computeSourceFitRect(fit, boxWidth, boxHeight, sourceW, sourceH);

  useLayoutEffect(() => {
    if (!video || !isVisible) return;
    let rafId: number;

    const tick = () => {
      const img = imageRef.current;
      if (img && video.readyState >= 2) {
        img.image(video);
        scheduleBatchDraw();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [video, scheduleBatchDraw, isVisible]);

  if (!isVisible) return null;
  return (
    <Image
      ref={imageRef}
      image={video}
      x={rect.drawX}
      y={rect.drawY}
      width={rect.drawWidth}
      height={rect.drawHeight}
      crop={rect.crop}
      listening={true}
    />
  );
}

/** 이미지 소스: contain/cover로 Letterboxing·Pillarboxing 적용 */
function ImageSourceNode({
  image,
  boxWidth,
  boxHeight,
  fit,
  listening,
}: {
  image: HTMLImageElement;
  boxWidth: number;
  boxHeight: number;
  fit: SourceFitMode;
  listening: boolean;
}) {
  const sourceW = image.naturalWidth || boxWidth;
  const sourceH = image.naturalHeight || boxHeight;
  const rect = computeSourceFitRect(fit, boxWidth, boxHeight, sourceW, sourceH);
  return (
    <Image
      image={image}
      x={rect.drawX}
      y={rect.drawY}
      width={rect.drawWidth}
      height={rect.drawHeight}
      crop={rect.crop}
      listening={listening}
    />
  );
}

/** 배너 하단 바 + 티커(가로 스크롤) 텍스트 — 시간 기반 일정 속도, scheduleBatchDraw로 프레임당 1회만 그리기. */
function BannerOverlayNode({
  banner,
  stageWidth,
  stageHeight,
  scheduleBatchDraw,
  brandColor,
}: {
  banner: BannerItem;
  stageWidth: number;
  stageHeight: number;
  scheduleBatchDraw: () => void;
  brandColor: string;
}) {
  const BANNER_HEIGHT = 48;
  const TICKER_SPEED = 80; // px/s (일정 속도)
  const CHAR_WIDTH_EST = 11; // Arial 18px 대략
  const y = stageHeight - BANNER_HEIGHT;
  const startTimeRef = useRef(0);
  const startXRef = useRef(0);
  const [tickerX, setTickerX] = useState(0);

  useLayoutEffect(() => {
    if (!banner.isTicker) return;
    const now = performance.now() / 1000;
    startTimeRef.current = now;
    startXRef.current = stageWidth;
    setTickerX(stageWidth);

    let rafId: number;
    const tick = () => {
      const t = performance.now() / 1000;
      const elapsed = t - startTimeRef.current;
      const textWidth = Math.max(100, banner.text.length * CHAR_WIDTH_EST);
      let x = startXRef.current - elapsed * TICKER_SPEED;

      if (x < -textWidth) {
        startTimeRef.current = t;
        startXRef.current = stageWidth;
        x = stageWidth;
      }
      setTickerX(x);
      scheduleBatchDraw();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [banner.isTicker, banner.text, stageWidth, scheduleBatchDraw]);

  const BANNER_INSET_LEFT = -2;
  const BANNER_INSET_RIGHT = 2;
  const bannerX = BANNER_INSET_LEFT;
  const bannerW = stageWidth - BANNER_INSET_LEFT - BANNER_INSET_RIGHT;

  return (
    <>
      <Rect
        x={bannerX}
        y={y}
        width={bannerW}
        height={BANNER_HEIGHT}
        fill={brandColor || "#4f46e5"}
        listening={false}
      />
      {banner.isTicker ? (
        <Group
          clip={{ x: bannerX, y, width: bannerW, height: BANNER_HEIGHT }}
          listening={false}
        >
          <Text
            x={tickerX}
            y={y + BANNER_HEIGHT / 2 - 10}
            text={banner.text}
            fontSize={18}
            fontFamily="Arial"
            fill="white"
            listening={false}
          />
        </Group>
      ) : (
        <Text
          x={bannerX + 16}
          y={y + BANNER_HEIGHT / 2 - 10}
          width={bannerW - 32}
          text={banner.text}
          fontSize={18}
          fontFamily="Arial"
          fill="white"
          listening={false}
        />
      )}
    </>
  );
}

/** 에셋 오버레이: 드래그·리사이즈 가능, 스타일 색상 반영 */
function AssetOverlayNode({
  asset,
  stageWidth,
  stageHeight,
  brandColor,
  transform,
  isEditMode,
  groupRef,
  onDragEnd,
  onTransformEnd,
}: {
  asset: AssetItem;
  stageWidth: number;
  stageHeight: number;
  brandColor: string;
  transform: { x: number; y: number; width: number; height: number };
  isEditMode: boolean;
  groupRef: React.RefObject<Konva.Group | null>;
  onDragEnd: (x: number, y: number) => void;
  onTransformEnd: (x: number, y: number, width: number, height: number) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!asset.fileUrl) return setImg(null);
    const el = document.createElement("img");
    el.crossOrigin = "anonymous";
    el.src = asset.fileUrl;
    el.onload = () => setImg(el);
    return () => setImg(null);
  }, [asset.fileUrl]);

  const { x, y, width: w, height: h } = transform;

  return (
    <Group
      id="overlay-asset"
      ref={groupRef}
      x={x}
      y={y}
      width={w}
      height={h}
      draggable={isEditMode}
      listening={true}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd(node.x(), node.y());
      }}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Group;
        const rect = node.getClientRect();
        onTransformEnd(rect.x, rect.y, rect.width, rect.height);
        node.scaleX(1);
        node.scaleY(1);
        node.position({ x: rect.x, y: rect.y });
        node.width(rect.width);
        node.height(rect.height);
        node.getChildren().forEach((child) => {
          child.width(rect.width);
          child.height(rect.height);
        });
      }}
    >
      {img ? (
        <Image image={img} x={0} y={0} width={w} height={h} listening={false} />
      ) : (
        <>
          <Rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill={brandColor || "rgba(79, 70, 229, 0.9)"}
            cornerRadius={8}
            listening={false}
          />
          <Text
            x={12}
            y={h / 2 - 10}
            width={w - 24}
            text={asset.name}
            fontSize={14}
            fontFamily="Arial"
            fill="white"
            listening={false}
          />
        </>
      )}
    </Group>
  );
}

function PreviewAreaInner({
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
  activeBanner = null,
  activeAsset = null,
  styleState = null,
}: PreviewAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const captureLayerRef = useRef<Konva.Layer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());
  const assetGroupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [effectivePixelRatio, setEffectivePixelRatio] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sourceElements, setSourceElements] = useState<
    Map<string, HTMLVideoElement | HTMLImageElement>
  >(new Map());

  const batchDrawScheduledRef = useRef(false);
  const scheduleBatchDraw = useCallback(() => {
    if (batchDrawScheduledRef.current) return;
    batchDrawScheduledRef.current = true;
    requestAnimationFrame(() => {
      layerRef.current?.batchDraw();
      batchDrawScheduledRef.current = false;
    });
  }, []);

  const captureBatchDrawScheduledRef = useRef(false);
  const scheduleCaptureBatchDraw = useCallback(() => {
    if (captureBatchDrawScheduledRef.current) return;
    captureBatchDrawScheduledRef.current = true;
    requestAnimationFrame(() => {
      captureLayerRef.current?.batchDraw();
      captureBatchDrawScheduledRef.current = false;
    });
  }, []);

  /** 줌 시 DPR만 갱신. containerSize는 ResizeObserver에서만 갱신해 충돌 방지. Stage key 제거로 리마운트 없이 RAF 유지. */
  const VIEWPORT_DEBOUNCE_MS = 120;
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const applyPixelRatio = () => {
      const dpr = window.devicePixelRatio ?? 1;
      const zoom = window.visualViewport?.scale ?? 1;
      setEffectivePixelRatio(Math.min(Math.max(dpr * zoom, 1), 5));
    };

    const scheduleUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        timeoutId = null;
        applyPixelRatio();
      }, VIEWPORT_DEBOUNCE_MS);
    };

    applyPixelRatio();
    window.visualViewport.addEventListener("resize", scheduleUpdate);
    window.visualViewport.addEventListener("scroll", scheduleUpdate);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("scroll", scheduleUpdate);
    };
  }, []);

  const { width: stageWidth, height: stageHeight } =
    RESOLUTION_SIZE[resolution];

  const defaultAssetTransform = useCallback(
    () => ({
      x: (stageWidth - 200) / 2,
      y: 24,
      width: 200,
      height: 60,
    }),
    [stageWidth]
  );
  const [assetTransform, setAssetTransform] = useState(defaultAssetTransform);

  useEffect(() => {
    if (activeAsset) setAssetTransform(defaultAssetTransform());
  }, [activeAsset?.id, defaultAssetTransform]);

  /** 프리뷰 표시용: 비율 유지, 레터박스 허용. 컨테이너 크기 미측정 시 논리 해상도 사용 */
  const hasContainerSize = containerSize.width > 0 && containerSize.height > 0;
  const displayWidth = hasContainerSize ? containerSize.width : stageWidth;
  const displayHeight = hasContainerSize ? containerSize.height : stageHeight;
  const displayScale = hasContainerSize
    ? Math.min(displayWidth / stageWidth, displayHeight / stageHeight)
    : 1;
  const displayOffsetX = Math.floor(
    (displayWidth - stageWidth * displayScale) / 2
  );
  const displayOffsetY = 0;

  const displaySources = sources.filter((s) => s.isVisible);
  /** 1=맨 앞(상단), 숫자 커질수록 뒤: 낮은 zIndex 먼저 그려서 높은 zIndex가 위에 오도록 */
  const sortedSources = [...displaySources].sort(
    (a, b) =>
      (sourceTransforms[a.id]?.zIndex ?? 0) -
      (sourceTransforms[b.id]?.zIndex ?? 0)
  );
  const arranged = arrangeSourcesInLayout(
    layout,
    sortedSources.map((s, i) => ({ source: s, index: i })),
    stageWidth,
    stageHeight
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
      return {
        x: 0,
        y: 0,
        width: stageWidth,
        height: stageHeight,
        zIndex: index,
      };
    },
    [sourceTransforms, arranged, stageWidth, stageHeight]
  );

  const hasSources = sources.length > 0 && sources.some((s) => s.isVisible);

  /** hasSources가 true일 때만 containerRef가 마운트됨. 의존성에 포함해 컨테이너가 렌더된 후 ResizeObserver 설정 */
  useEffect(() => {
    if (!hasSources) return;
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const w = Math.floor(el.clientWidth);
      const h = Math.floor(el.clientHeight);
      setContainerSize((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      );
    };
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    updateSize();
    return () => ro.disconnect();
  }, [hasSources]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = Math.floor(el.clientWidth);
    const h = Math.floor(el.clientHeight);
    if (w > 0 && h > 0) {
      setContainerSize((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      );
    }
  }, [hasSources]);

  useEffect(() => {
    if (selectedId === "overlay-asset") {
      const node = assetGroupRef.current;
      trRef.current?.nodes(node ? [node] : []);
    } else if (selectedId) {
      const node = nodeRefs.current.get(selectedId);
      trRef.current?.nodes(node ? [node] : []);
    } else {
      trRef.current?.nodes([]);
    }
    layerRef.current?.batchDraw();
  }, [selectedId]);

  useEffect(() => {
    if (!getPreviewStreamRef) return;
    getPreviewStreamRef.current = () => {
      const layer = captureLayerRef.current;
      if (!layer) return null;
      const canvas = (layer.getCanvas() as { _canvas?: HTMLCanvasElement })
        ?._canvas;
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

    const addElement = (
      sourceId: string,
      element: HTMLVideoElement | HTMLImageElement
    ) => {
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
          if (
            !stream &&
            typeof getSourceStream !== "function" &&
            source.type === "video"
          ) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
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
                audio: source.deviceId
                  ? { deviceId: { ideal: source.deviceId } }
                  : true,
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
        stream.getTracks().forEach((t) => t.stop())
      );
      streamsMap.current.clear();
    };
  }, [sources, availableStreamIds, getSourceStream]);

  if (!hasSources) {
    return (
      <div
        className={cn(
          "bg-black rounded-lg border border-gray-700 h-full w-full relative overflow-hidden flex flex-col items-center justify-center text-gray-500",
          className
        )}
      >
        <span
          className={cn(
            "absolute top-2 left-2 z-10 px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide",
            isEditMode
              ? "bg-amber-500/90 text-amber-950"
              : "bg-red-600 text-white"
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
        className
      )}
    >
      <span
        className={cn(
          "absolute top-2 left-2 z-10 px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide",
          isEditMode
            ? "bg-amber-500/90 text-amber-950"
            : "bg-red-600 text-white"
        )}
      >
        {isEditMode ? resolution : `Live ${resolution}`}
      </span>
      {/* 표시용 Stage: 컨테이너 크기, 비율 유지(레터박스) */}
      <Stage
        ref={stageRef}
        width={Math.max(1, displayWidth)}
        height={Math.max(1, displayHeight)}
        pixelRatio={effectivePixelRatio}
        className="absolute inset-0"
        style={{ left: 0, top: 0 }}
        onClick={(e) => {
          const layer = layerRef.current;
          let node: Konva.Node | null = e.target;
          while (node && node.getParent() !== layer) {
            if (
              node.getClassName?.() === "Group" &&
              (node as Konva.Group).id?.() === "overlay-asset"
            ) {
              setSelectedId("overlay-asset");
              return;
            }
            const gid = (node as Konva.Group).id?.();
            if (gid && sortedSources.some((s) => s.id === gid)) {
              setSelectedId(gid);
              if (isEditMode && onBringSourceToFront) {
                onBringSourceToFront(gid);
              }
              return;
            }
            node = node.getParent();
          }
          setSelectedId(null);
        }}
      >
        <Layer ref={layerRef}>
          <Group
            scaleX={displayScale}
            scaleY={displayScale}
            x={displayOffsetX}
            y={displayOffsetY}
          >
            <Rect
              x={0}
              y={0}
              width={stageWidth}
              height={stageHeight}
              fill="black"
            />
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
                  clip={
                    styleState?.theme === "bubble" && source.type === "video"
                      ? undefined
                      : {
                          x: 0,
                          y: 0,
                          width: transform.width,
                          height: transform.height,
                        }
                  }
                  clipFunc={
                    styleState?.theme === "bubble" && source.type === "video"
                      ? (ctx) => {
                          const w = transform.width;
                          const h = transform.height;
                          const r = Math.min(w, h) / 2;
                          ctx.beginPath();
                          ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
                          ctx.closePath();
                          ctx.clip();
                        }
                      : undefined
                  }
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
                      stageHeight
                    );
                    setSourceTransform?.(source.id, {
                      x: snapped.x,
                      y: snapped.y,
                    });
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
                      stageHeight
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
                        boxWidth={transform.width}
                        boxHeight={transform.height}
                        fit="contain"
                        scheduleBatchDraw={scheduleBatchDraw}
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
                      <ImageSourceNode
                        image={el}
                        boxWidth={transform.width}
                        boxHeight={transform.height}
                        fit="contain"
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
            {activeBanner && (
              <BannerOverlayNode
                banner={activeBanner}
                stageWidth={stageWidth}
                stageHeight={stageHeight}
                scheduleBatchDraw={scheduleBatchDraw}
                brandColor={styleState?.brandColor ?? "#4f46e5"}
              />
            )}
            {activeAsset && (
              <AssetOverlayNode
                asset={activeAsset}
                stageWidth={stageWidth}
                stageHeight={stageHeight}
                brandColor={styleState?.brandColor ?? "#4f46e5"}
                transform={assetTransform}
                isEditMode={isEditMode}
                groupRef={assetGroupRef}
                onDragEnd={(x, y) =>
                  setAssetTransform((prev) => ({ ...prev, x, y }))
                }
                onTransformEnd={(x, y, width, height) =>
                  setAssetTransform({ x, y, width, height })
                }
              />
            )}
            {isEditMode && <Transformer ref={trRef} />}
          </Group>
        </Layer>
      </Stage>

      {/* 송출/녹화용 Stage: 720p/1080p 고정 해상도, 화면 밖에 숨김 */}
      <Stage
        width={stageWidth}
        height={stageHeight}
        pixelRatio={1}
        style={{
          position: "absolute",
          left: -9999,
          top: 0,
          pointerEvents: "none",
          visibility: "hidden" as const,
        }}
      >
        <Layer ref={captureLayerRef}>
          <Rect
            x={0}
            y={0}
            width={stageWidth}
            height={stageHeight}
            fill="black"
          />
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
                key={`capture-${source.id}`}
                x={transform.x}
                y={transform.y}
                clip={
                  styleState?.theme === "bubble" && source.type === "video"
                    ? undefined
                    : {
                        x: 0,
                        y: 0,
                        width: transform.width,
                        height: transform.height,
                      }
                }
                clipFunc={
                  styleState?.theme === "bubble" && source.type === "video"
                    ? (ctx) => {
                        const w = transform.width;
                        const h = transform.height;
                        const r = Math.min(w, h) / 2;
                        ctx.beginPath();
                        ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.clip();
                      }
                    : undefined
                }
                listening={false}
              >
                {source.type === "video" || source.type === "screen" ? (
                  el && el instanceof HTMLVideoElement ? (
                    <VideoSourceNode
                      sourceId={`capture-${source.id}`}
                      video={el}
                      boxWidth={transform.width}
                      boxHeight={transform.height}
                      fit="contain"
                      scheduleBatchDraw={scheduleCaptureBatchDraw}
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
                    <ImageSourceNode
                      image={el}
                      boxWidth={transform.width}
                      boxHeight={transform.height}
                      fit="contain"
                      listening={false}
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
                    listening={false}
                  />
                )}
              </Group>
            );
          })}
          {activeBanner && (
            <BannerOverlayNode
              banner={activeBanner}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              scheduleBatchDraw={scheduleCaptureBatchDraw}
              brandColor={styleState?.brandColor ?? "#4f46e5"}
            />
          )}
          {activeAsset && (
            <AssetOverlayNode
              asset={activeAsset}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              brandColor={styleState?.brandColor ?? "#4f46e5"}
              transform={assetTransform}
              isEditMode={false}
              groupRef={{ current: null }}
              onDragEnd={() => {}}
              onTransformEnd={() => {}}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

export const PreviewArea = React.memo(PreviewAreaInner);
