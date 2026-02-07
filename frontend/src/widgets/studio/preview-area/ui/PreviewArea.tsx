"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
  useMemo,
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
  toPixelTransform,
  toNormalizedTransform,
} from "@/shared/lib/canvas";
import type { SourceFitMode } from "@/shared/lib/canvas";
import {
  setPreferredVideoDeviceId,
  setPreferredAudioDeviceId,
} from "@/shared/lib/device-preferences";
import type { BannerItem } from "@/widgets/studio/studio-sidebar/panels/StudioBannerPanel";
import type { AssetItem } from "@/widgets/studio/studio-sidebar/panels/StudioAssetPanel";
import type { StudioStyleState } from "@/widgets/studio/studio-sidebar/panels/StudioStylePanel";
import type { ChatMessage } from "@/entities/chat/model";

export interface ChatOverlayConfig {
  visible: boolean;
  messageCount: number; // 표시할 최근 메시지 수 (기본 5)
}

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
  /** setupSources 재실행 트리거: ID 집합이 실제로 바뀔 때만 변경 (배열 ref만 바뀌는 것 방지 → 화면공유 새로고침/끊김 방지) */
  streamIdsKey?: string;
  /** Phase 4: 송출 중이면 표시용 Stage RAF 스로틀 (메인 스레드 부하 감소) */
  isStreaming?: boolean;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  isEditMode?: boolean;
  resolution?: PreviewResolution;
  getSourceStream?: (sourceId: string) => MediaStream | undefined;
  getPreviewStreamRef?: GetPreviewStreamRef | null;
  /** Go Live 직전 캡처용 레이어를 1회 그리기 (화면공유 포함 프레임 확보) */
  requestCaptureDrawRef?: React.MutableRefObject<
    (() => Promise<void>) | null
  > | null;
  sourceTransforms?: Record<string, SourceTransform>;
  setSourceTransform?: (
    sourceId: string,
    partial: Partial<SourceTransform>
  ) => void;
  onBringSourceToFront?: (sourceId: string) => void;
  activeBanner?: BannerItem | null;
  activeAsset?: AssetItem | null;
  styleState?: StudioStyleState | null;
  chatOverlayConfig?: ChatOverlayConfig | null;
  chatMessages?: ChatMessage[];
}

/** 비디오/화면 소스: Konva Image에 비디오를 매 프레임 그리기. scheduleBatchDraw로 프레임당 1회만 그리기 요청. registerExternalUpdate 있으면 단일 RAF에서 호출됨(캡처용). */
function VideoSourceNode({
  sourceId,
  video,
  boxWidth,
  boxHeight,
  fit,
  scheduleBatchDraw,
  isVisible,
  registerExternalUpdate,
  /** Phase 4: true면 표시용 RAF에서 매 2프레임마다만 갱신 (30fps) */
  throttlePreview = false,
}: {
  sourceId: string;
  video: HTMLVideoElement;
  boxWidth: number;
  boxHeight: number;
  fit: SourceFitMode;
  scheduleBatchDraw: () => void;
  isVisible: boolean;
  /** 캡처용: 부모 단일 RAF에서 이 노드 갱신 호출 (자체 RAF 미사용) */
  registerExternalUpdate?: (fn: () => void) => () => void;
  /** Phase 4: true면 표시용 RAF에서 매 2프레임마다만 갱신 */
  throttlePreview?: boolean;
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

  /** Phase 2: 캡처용 — 부모 단일 RAF에 업데이트 함수 등록 */
  useEffect(() => {
    if (!registerExternalUpdate || !video || !isVisible) return;
    const update = () => {
      const img = imageRef.current;
      if (img && video.readyState >= 2) img.image(video);
    };
    const unregister = registerExternalUpdate(update);
    return unregister;
  }, [registerExternalUpdate, video, isVisible]);

  /** 표시용 또는 캡처용(registerExternalUpdate 없을 때): 자체 RAF */
  useLayoutEffect(() => {
    if (registerExternalUpdate || !video || !isVisible) return;
    let rafId: number;
    let frameCount = 0;
    const tick = () => {
      frameCount += 1;
      // Phase 4: 송출 중이면 매 2프레임마다만 갱신 (30fps)
      if (throttlePreview && frameCount % 2 !== 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const img = imageRef.current;
      if (img && video.readyState >= 2) {
        img.image(video);
        scheduleBatchDraw();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [video, scheduleBatchDraw, isVisible, registerExternalUpdate, throttlePreview]);

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

/** 채팅 오버레이: 최근 메시지를 반투명 배경 위에 표시. 편집 모드에서 드래그 가능 */
function ChatOverlayNode({
  messages,
  messageCount,
  stageWidth,
  stageHeight,
  position,
  isEditMode,
  groupRef,
  onDragEnd,
}: {
  messages: ChatMessage[];
  messageCount: number;
  stageWidth: number;
  stageHeight: number;
  position: { x: number; y: number };
  isEditMode: boolean;
  groupRef: React.RefObject<Konva.Group | null>;
  onDragEnd: (x: number, y: number) => void;
}) {
  const BOX_WIDTH = 320;
  const BOX_HEIGHT = 250;
  const LINE_HEIGHT = 20;
  const PADDING = 10;
  const FONT_SIZE = 13;

  const recent = messages.slice(-messageCount);

  return (
    <Group
      id="overlay-chat"
      ref={groupRef}
      x={position.x}
      y={position.y}
      width={BOX_WIDTH}
      height={BOX_HEIGHT}
      draggable={isEditMode}
      listening={true}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd(node.x(), node.y());
      }}
    >
      <Rect
        x={0}
        y={0}
        width={BOX_WIDTH}
        height={BOX_HEIGHT}
        fill="rgba(0,0,0,0.55)"
        cornerRadius={8}
        listening={false}
      />
      <Group
        clip={{ x: 0, y: 0, width: BOX_WIDTH, height: BOX_HEIGHT }}
        listening={false}
      >
        {recent.map((m, i) => (
          <Text
            key={m.messageId}
            x={PADDING}
            y={BOX_HEIGHT - (recent.length - i) * LINE_HEIGHT - PADDING}
            width={BOX_WIDTH - PADDING * 2}
            text={`${m.senderName}: ${m.content}`}
            fontSize={FONT_SIZE}
            fontFamily="Arial"
            fill="white"
            wrap="none"
            ellipsis={true}
            listening={false}
          />
        ))}
      </Group>
    </Group>
  );
}

function PreviewAreaInner({
  className,
  layout = "full",
  sources = [],
  availableStreamIds = [],
  streamIdsKey,
  isVideoEnabled = true,
  isAudioEnabled = true,
  isEditMode = true,
  resolution = "720p",
  getSourceStream,
  getPreviewStreamRef,
  requestCaptureDrawRef,
  sourceTransforms = {},
  setSourceTransform,
  onBringSourceToFront,
  activeBanner = null,
  activeAsset = null,
  styleState = null,
  isStreaming = false,
  chatOverlayConfig = null,
  chatMessages = [],
}: PreviewAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const captureLayerRef = useRef<Konva.Layer>(null);
  const captureStageRef = useRef<Konva.Stage>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());
  const assetGroupRef = useRef<Konva.Group>(null);
  const chatOverlayGroupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  /** 드래그 중인 소스 ID — 드래그 중에는 Konva 노드의 현재 위치를 사용해 re-render snap-back 방지 */
  const draggingIdRef = useRef<string | null>(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  /** 마운트 시 DPR 1회 캡처 — 줌 시 동적 갱신하지 않아 Konva 캔버스 재생성(검은 화면) 방지 */
  const stablePixelRatio = useRef(
    typeof window !== "undefined" ? Math.ceil(window.devicePixelRatio ?? 1) : 1
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCapturePreview, setShowCapturePreview] = useState(false);
  const [sourceElements, setSourceElements] = useState<
    Map<string, HTMLVideoElement | HTMLImageElement>
  >(new Map());
  const capturePreviewVideoRef = useRef<HTMLVideoElement>(null);
  const capturePreviewStreamRef = useRef<MediaStream | null>(null);

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

  /** Phase 2: 캡처용 Stage — 소스별 RAF 대신 단일 RAF에서 한 번에 갱신 후 1회 그리기 */
  const captureUpdatersRef = useRef<Set<() => void>>(new Set());
  const registerCaptureUpdate = useCallback((fn: () => void) => {
    captureUpdatersRef.current.add(fn);
    return () => {
      captureUpdatersRef.current.delete(fn);
    };
  }, []);

  /** DPR은 마운트 시 stablePixelRatio ref에 1회 캡처.
   *  줌 시 visualViewport 이벤트로 State를 갱신하면 Konva Stage의 pixelRatio prop이
   *  바뀌어 내부 캔버스가 재생성되고 검은 화면이 깜빡이므로 동적 갱신하지 않음. */

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
  const [chatOverlayPos, setChatOverlayPos] = useState({ x: stageWidth - 336, y: stageHeight - 310 });

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
  const displayOffsetY = Math.floor(
    (displayHeight - stageHeight * displayScale) / 2
  );

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
      let result;
      // 저장된 정규화 좌표가 있으면 픽셀 변환 (clamp 포함)
      if (t && t.width > 0 && t.height > 0) {
        result = toPixelTransform(t, stageWidth, stageHeight);
      }
      // 레이아웃 셀을 정규화로 변환 후 픽셀 변환 (항상 가시 영역 내)
      else if (cell) {
        const normalized = toNormalizedTransform(
          {
            x: cell.x,
            y: cell.y,
            width: cell.width,
            height: cell.height,
            zIndex: index,
          },
          stageWidth,
          stageHeight
        );
        result = toPixelTransform(normalized, stageWidth, stageHeight);
      }
      // 기본값: 전체 영역 (정규화: 0,0,1,1)
      else {
        result = toPixelTransform(
          { x: 0, y: 0, width: 1, height: 1, zIndex: index },
          stageWidth,
          stageHeight
        );
      }
      return result;
    },
    [sourceTransforms, arranged, stageWidth, stageHeight]
  );

  const hasSources = sources.length > 0 && sources.some((s) => s.isVisible);

  /** Phase 2: 캡처용 Stage 단일 RAF — hasSources 선언 이후에 배치 */
  useLayoutEffect(() => {
    if (!hasSources) return;
    let rafId: number;
    const tick = () => {
      captureUpdatersRef.current.forEach((update) => update());
      captureLayerRef.current?.batchDraw();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [hasSources]);

  /** Phase 1: UI Stage와 Virtual Canvas Stage 동기화 — sourceElements/sortedSources/sourceTransforms 변경 시 즉시 캡처 레이어 갱신 */
  const sourceElementsKey = useMemo(
    () =>
      Array.from(sourceElements.keys())
        .sort()
        .map((id) => `${id}:${sourceElements.get(id)?.constructor.name ?? ""}`)
        .join("|"),
    [sourceElements]
  );
  const sortedSourcesKey = useMemo(
    () => sortedSources.map((s) => s.id).join(","),
    [sortedSources]
  );
  const sourceTransformsSyncKey = useMemo(
    () =>
      sortedSources
        .map((s) => `${s.id}:${sourceTransforms[s.id]?.x ?? ""},${sourceTransforms[s.id]?.y ?? ""},${sourceTransforms[s.id]?.width ?? ""},${sourceTransforms[s.id]?.height ?? ""}`)
        .join("|"),
    [sortedSources, sourceTransforms]
  );
  useLayoutEffect(() => {
    if (!hasSources) return;
    // sourceElements, sortedSources, 또는 sourceTransforms가 변경되면 즉시 캡처 레이어를 갱신하여 UI Stage와 동기화
    // useLayoutEffect를 사용하여 React 렌더링 직후 동기적으로 실행 (DOM 업데이트 전)
    captureUpdatersRef.current.forEach((update) => update());
    scheduleCaptureBatchDraw();
  }, [hasSources, sourceElementsKey, sortedSourcesKey, sourceTransformsSyncKey, scheduleCaptureBatchDraw]);

  /** hasSources가 true일 때만 containerRef가 마운트됨. 의존성에 포함해 컨테이너가 렌더된 후 ResizeObserver 설정.
   *  줌 시 ResizeObserver가 연속 호출되어 Stage width/height가 계속 바뀌면 검은 화면이 깜빡이므로
   *  rAF + 300ms 디바운스로 최종 크기만 반영한다. */
  useEffect(() => {
    if (!hasSources) return;
    const el = containerRef.current;
    if (!el) return;
    let rafId: number | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const commitSize = () => {
      const w = Math.floor(el.clientWidth);
      const h = Math.floor(el.clientHeight);
      setContainerSize((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      );
    };
    const onResize = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          rafId = null;
          commitSize();
        });
      }, 300);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    commitSize(); // 최초 1회 즉시 측정
    return () => {
      ro.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [hasSources]);

  /** 해상도 변경 시에도 컨테이너 재측정 및 스케일 재계산 트리거 */
  useLayoutEffect(() => {
    if (!hasSources) return;
    const el = containerRef.current;
    if (!el) return;
    const w = Math.floor(el.clientWidth);
    const h = Math.floor(el.clientHeight);
    if (w > 0 && h > 0) {
      setContainerSize((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      );
    }
  }, [hasSources, resolution]);

  /** 해상도 변경 시 Konva 레이어 리드로우 */
  useEffect(() => {
    layerRef.current?.batchDraw();
    captureLayerRef.current?.batchDraw();
  }, [resolution]);

  useEffect(() => {
    if (selectedId === "overlay-asset") {
      const node = assetGroupRef.current;
      trRef.current?.nodes(node ? [node] : []);
    } else if (selectedId === "overlay-chat") {
      const node = chatOverlayGroupRef.current;
      trRef.current?.nodes(node ? [node] : []);
    } else if (selectedId) {
      const node = nodeRefs.current.get(selectedId);
      trRef.current?.nodes(node ? [node] : []);
    } else {
      trRef.current?.nodes([]);
    }
    layerRef.current?.batchDraw();
  }, [selectedId]);

  /** 송출/녹화에 사용하는 캔버스는 캡처용 Stage 하나뿐. 표시용 Stage(layerRef)는 절대 captureStream 하지 않음. */
  useEffect(() => {
    if (!getPreviewStreamRef) return;
    getPreviewStreamRef.current = () => {
      const captureStage = captureStageRef.current;
      const captureLayer = captureLayerRef.current;
      const uiStage = stageRef.current;
      const uiLayer = layerRef.current;
      if (!captureStage || !captureLayer) {
        console.error("[PreviewArea] Virtual Canvas Stage 또는 Layer가 없습니다.");
        return null;
      }
      // UI Stage와 혼동 방지: Stage/Layer가 완전히 분리되어 있는지 검증
      if (captureStage === uiStage) {
        console.error("[PreviewArea] 치명적 오류: captureStageRef와 stageRef가 같은 Stage를 참조합니다!");
        return null;
      }
      if (captureLayer === uiLayer) {
        console.error("[PreviewArea] 치명적 오류: captureLayerRef와 layerRef가 같은 Layer를 참조합니다!");
        return null;
      }
      // Virtual Canvas Stage 해상도 검증 (720p/1080p만 허용)
      const expectedWidths = [1280, 1920];
      const expectedHeights = [720, 1080];
      const isValidSize =
        expectedWidths.includes(captureStage.width()) &&
        expectedHeights.includes(captureStage.height());
      if (!isValidSize) {
        console.warn(
          "[PreviewArea] 경고: Virtual Canvas Stage 해상도가 예상과 다릅니다:",
          captureStage.width(),
          "x",
          captureStage.height(),
          "(예상: 1280x720 또는 1920x1080)"
        );
      }
      const canvas = (captureLayer.getCanvas() as { _canvas?: HTMLCanvasElement })
        ?._canvas;
      if (!canvas) {
        console.error("[PreviewArea] Virtual Canvas Stage의 canvas를 찾을 수 없습니다.");
        return null;
      }
      // Phase 3: 24fps로 부하 완화 (30→24)
      const stream = canvas.captureStream?.(24) ?? null;
      if (stream) {
        console.log(
          "[PreviewArea] Virtual Canvas Stage에서 스트림 생성:",
          canvas.width,
          "x",
          canvas.height,
          "@ 24fps"
        );
      }
      return stream;
    };
    return () => {
      getPreviewStreamRef.current = null;
    };
  }, [getPreviewStreamRef]);

  /** 로컬에서 캡처 스트림 미러(디버그용) */
  useEffect(() => {
    if (!isStreaming || !showCapturePreview) {
      if (capturePreviewStreamRef.current) {
        capturePreviewStreamRef.current
          .getTracks()
          .forEach((t) => t.stop());
        capturePreviewStreamRef.current = null;
      }
      if (capturePreviewVideoRef.current) {
        capturePreviewVideoRef.current.srcObject = null;
      }
      return;
    }
    const stream = getPreviewStreamRef?.current?.() ?? null;
    capturePreviewStreamRef.current = stream;
    const videoEl = capturePreviewVideoRef.current;
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {});
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (videoEl) videoEl.srcObject = null;
      capturePreviewStreamRef.current = null;
    };
  }, [isStreaming, showCapturePreview, getPreviewStreamRef]);

  /** Phase 1: Go Live 직전 캡처용 레이어를 명시적으로 1회 그린 뒤 다음 프레임까지 대기 */
  useEffect(() => {
    if (!requestCaptureDrawRef) return;
    requestCaptureDrawRef.current = async () => {
      scheduleCaptureBatchDraw();
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );
    };
    return () => {
      requestCaptureDrawRef.current = null;
    };
  }, [requestCaptureDrawRef, scheduleCaptureBatchDraw]);

  /** 송출 중 편집 시 캡처 레이어 즉시 동기화(레이아웃/트랜스폼 변경 반영) */
  const sourceTransformsKey = useMemo(
    () =>
      sortedSources
        .map((s) => `${s.id}:${sourceTransforms[s.id]?.x ?? ""},${sourceTransforms[s.id]?.y ?? ""},${sourceTransforms[s.id]?.width ?? ""},${sourceTransforms[s.id]?.height ?? ""}`)
        .join("|"),
    [sortedSources, sourceTransforms]
  );
  useEffect(() => {
    if (!isStreaming || !hasSources) return;
    scheduleCaptureBatchDraw();
  }, [isStreaming, hasSources, sourceTransformsKey, scheduleCaptureBatchDraw]);

  const streamsMap = useRef<Map<string, MediaStream>>(new Map());

  /** 소스 ID 목록 안정화: visibility/순서 변경만으로 재실행 방지 */
  const sourceIdsKey = useMemo(
    () => sources.map((s) => s.id).sort().join(","),
    [sources]
  );
  /** 소스 셋업 시 최신 sources를 참조하기 위한 ref */
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;

  useEffect(() => {
    let cancelled = false;
    const currentSources = sourcesRef.current;
    const sourceIds = new Set(currentSources.map((s) => s.id));

    // 제거된 소스만 삭제 + 해당 스트림 정리 (전체 클리어 X → 검은 화면 방지)
    setSourceElements((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Map(prev);
      next.forEach((_, id) => {
        if (!sourceIds.has(id)) {
          next.delete(id);
          // 제거된 소스의 스트림만 정리
          const stream = streamsMap.current.get(id);
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
            streamsMap.current.delete(id);
          }
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    const addElement = (
      sourceId: string,
      element: HTMLVideoElement | HTMLImageElement
    ) => {
      if (cancelled) return;
      setSourceElements((prev) => new Map(prev).set(sourceId, element));
    };

    const setupSources = async () => {
      for (const source of currentSources) {
        if (cancelled) return;

        // 이미 엘리먼트가 존재하면 건너뛰기 → 불필요한 재생성/검은 화면 방지
        const existing = sourceElements.get(source.id);
        if (existing) continue;

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
    };
  }, [sourceIdsKey, streamIdsKey ?? availableStreamIds, getSourceStream]);

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
      {isStreaming && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
          <button
            type="button"
            className={cn(
              "px-2 py-1 rounded text-xs font-semibold border",
              showCapturePreview
                ? "bg-emerald-500/90 text-emerald-950 border-emerald-400"
                : "bg-gray-800/80 text-gray-200 border-gray-600"
            )}
            onClick={() => setShowCapturePreview((v) => !v)}
            title="송출 캡처 미리보기 토글"
          >
            송출 미리보기
          </button>
        </div>
      )}
      {isStreaming && showCapturePreview && (
        <div className="absolute top-10 right-2 z-20 w-48 aspect-video bg-black/80 border border-gray-700 rounded overflow-hidden shadow-lg">
          <video
            ref={capturePreviewVideoRef}
            muted
            playsInline
            className="w-full h-full object-contain"
          />
        </div>
      )}
      {/* 표시용 Stage: 컨테이너 크기, 비율 유지(레터박스) */}
      <Stage
        ref={stageRef}
        width={Math.max(1, displayWidth)}
        height={Math.max(1, displayHeight)}
        pixelRatio={stablePixelRatio.current}
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
            if (
              node.getClassName?.() === "Group" &&
              (node as Konva.Group).id?.() === "overlay-chat"
            ) {
              setSelectedId("overlay-chat");
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
              // 드래그 중이면 Konva 노드의 현재 위치를 사용 (re-render 시 상태 값으로 snap-back 방지)
              const isDragging = draggingIdRef.current === source.id;
              const existingNode = nodeRefs.current.get(source.id);
              const groupX = isDragging && existingNode ? existingNode.x() : transform.x;
              const groupY = isDragging && existingNode ? existingNode.y() : transform.y;
              return (
                <Group
                  key={source.id}
                  id={source.id}
                  ref={(node) => {
                    if (node) nodeRefs.current.set(source.id, node);
                  }}
                  x={groupX}
                  y={groupY}
                  clip={
                    source.type === "video" && styleState?.theme === "circle"
                      ? undefined
                      : source.type === "video" &&
                        styleState?.theme === "square"
                      ? (() => {
                          const w = transform.width;
                          const h = transform.height;
                          const size = Math.min(w, h);
                          return {
                            x: (w - size) / 2,
                            y: (h - size) / 2,
                            width: size,
                            height: size,
                          };
                        })()
                      : {
                          x: 0,
                          y: 0,
                          width: transform.width,
                          height: transform.height,
                        }
                  }
                  clipFunc={
                    source.type === "video" && styleState?.theme === "circle"
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
                  onDragStart={() => {
                    draggingIdRef.current = source.id;
                  }}
                  onDragEnd={(e) => {
                    draggingIdRef.current = null;
                    const node = e.target;
                    // Group 내부의 논리 좌표 (스케일 적용 전)
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
                    // 픽셀 좌표로 setSourceTransform 호출 (내부에서 정규화 변환)
                    setSourceTransform?.(source.id, {
                      x: snapped.x,
                      y: snapped.y,
                    });
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target as Konva.Group;
                    // getClientRect는 스케일/회전을 포함한 절대 좌표를 반환
                    // 하지만 우리는 Group 내부의 논리 좌표가 필요함
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    const width = transform.width * scaleX;
                    const height = transform.height * scaleY;
                    const x = node.x();
                    const y = node.y();
                    
                    const snappedPos = snapPosition(
                      x,
                      y,
                      width,
                      height,
                      stageWidth,
                      stageHeight
                    );
                    const snappedSize = snapSize(width, height);
                    
                    // 픽셀 좌표로 setSourceTransform 호출 (내부에서 정규화 변환)
                    setSourceTransform?.(source.id, {
                      x: snappedPos.x,
                      y: snappedPos.y,
                      width: snappedSize.width,
                      height: snappedSize.height,
                    });
                    
                    // 노드 스케일 리셋
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
                        throttlePreview={isStreaming}
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
            {chatOverlayConfig?.visible && chatMessages.length > 0 && (
              <ChatOverlayNode
                messages={chatMessages}
                messageCount={chatOverlayConfig.messageCount}
                stageWidth={stageWidth}
                stageHeight={stageHeight}
                position={chatOverlayPos}
                isEditMode={isEditMode}
                groupRef={chatOverlayGroupRef}
                onDragEnd={(x, y) => setChatOverlayPos({ x, y })}
              />
            )}
            {isEditMode && <Transformer ref={trRef} />}
          </Group>
        </Layer>
      </Stage>

      {/* 송출/녹화용 Stage: 720p/1080p 고정 해상도, 화면 밖에 숨김 */}
      <Stage
        ref={captureStageRef}
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
                  source.type === "video" && styleState?.theme === "circle"
                    ? undefined
                    : source.type === "video" && styleState?.theme === "square"
                    ? (() => {
                        const w = transform.width;
                        const h = transform.height;
                        const size = Math.min(w, h);
                        return {
                          x: (w - size) / 2,
                          y: (h - size) / 2,
                          width: size,
                          height: size,
                        };
                      })()
                    : {
                        x: 0,
                        y: 0,
                        width: transform.width,
                        height: transform.height,
                      }
                }
                clipFunc={
                  source.type === "video" && styleState?.theme === "circle"
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
                      registerExternalUpdate={registerCaptureUpdate}
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
          {chatOverlayConfig?.visible && chatMessages.length > 0 && (
            <ChatOverlayNode
              messages={chatMessages}
              messageCount={chatOverlayConfig.messageCount}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              position={chatOverlayPos}
              isEditMode={false}
              groupRef={{ current: null }}
              onDragEnd={() => {}}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

export const PreviewArea = React.memo(PreviewAreaInner);
