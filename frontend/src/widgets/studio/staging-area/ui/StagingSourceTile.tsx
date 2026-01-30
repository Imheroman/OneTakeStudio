"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Monitor, Plus, Minus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Source } from "@/entities/studio/model";

interface StagingSourceTileProps {
  source: Source;
  index: number;
  /** 백스테이지 순서 기준 레이어 번호 (1=맨 앞, 2=그 다음 …). 온 스테이지일 때만 표시 */
  layerOrder?: number;
  isEditMode: boolean;
  isOnStage: boolean;
  isDragging?: boolean;
  stream?: MediaStream | null;
  /** @dnd-kit 드래그 핸들에 붙일 listeners (순서 변경용) */
  dragHandleListeners?: object;
  /** @dnd-kit 드래그 핸들에 붙일 attributes */
  dragHandleAttributes?: object;
  onToggle: (sourceId: string) => void;
  onAddToStage: (sourceId: string) => void;
  onRemoveFromStage: (sourceId: string) => void;
  /** 백스테이지에서 소스 완전 제거(목록에서 삭제). 편집 모드에서만 표시 */
  onRemoveSource?: (sourceId: string) => void;
}

export function StagingSourceTile({
  source,
  index,
  layerOrder,
  isEditMode,
  isOnStage,
  isDragging,
  stream: streamProp,
  dragHandleListeners,
  dragHandleAttributes,
  onToggle,
  onAddToStage,
  onRemoveFromStage,
  onRemoveSource,
}: StagingSourceTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (source.type !== "video" && source.type !== "screen") return;
    if (streamProp && videoRef.current) {
      videoRef.current.srcObject = streamProp;
    }
  }, [source.type, streamProp]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-staging-index={index}
      className={cn(
        "relative shrink-0 w-[160px] h-[100px] rounded-lg border overflow-hidden flex flex-col",
        "bg-gray-800 border-gray-600 hover:border-gray-500",
        isDragging && "opacity-50 border-indigo-500 ring-1 ring-indigo-500 z-50",
        !source.isVisible && "opacity-60",
        isOnStage && "ring-2 ring-indigo-500/80",
      )}
    >
      {/* 드래그 핸들: @dnd-kit listeners/attributes만 붙이면 됨 */}
      {isEditMode && (
        <div
          {...(dragHandleAttributes ?? {})}
          {...(dragHandleListeners ?? {})}
          className="absolute top-0 left-0 z-20 flex h-8 w-8 cursor-grab active:cursor-grabbing items-center justify-center rounded-br bg-gray-900/90 text-gray-400 hover:bg-gray-700 hover:text-gray-200 select-none touch-none"
          title="순서 변경 드래그"
          aria-label="순서 변경"
        >
          <GripVertical className="h-4 w-4 pointer-events-none" />
        </div>
      )}
      <div className="flex-1 min-h-0 relative">
        {layerOrder != null && (
          <span
            className="absolute top-1 left-1 z-10 w-6 h-6 rounded-full bg-gray-900/90 text-white text-xs font-bold flex items-center justify-center border border-gray-600"
            aria-label={`레이어 ${layerOrder}`}
          >
            {layerOrder}
          </span>
        )}
        {isEditMode && onRemoveSource && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("이 소스를 백스테이지에서 제거할까요?")) onRemoveSource(source.id);
            }}
            className="absolute top-1 right-1 z-10 w-6 h-6 rounded bg-gray-900/90 text-red-400 hover:bg-red-600/90 hover:text-white flex items-center justify-center border border-gray-600 transition-colors pointer-events-auto"
            title="백스테이지에서 제거"
            aria-label="소스 제거"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
        {source.type === "video" || source.type === "screen" ? (
          streamProp ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              draggable={false}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700 gap-1">
              {source.type === "screen" ? (
                <Monitor className="h-8 w-8 text-gray-500" />
              ) : (
                <span className="text-2xl text-gray-500">📹</span>
              )}
              <span className="text-[10px] text-gray-500">연결 중...</span>
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            <Mic className="h-8 w-8 text-gray-400" />
          </div>
        )}
        {/* pointer-events-none으로 드래그가 아래 타일로 전달되게 하고, 버튼만 클릭 가능 */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2">
              {isOnStage ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromStage(source.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/90 text-white text-xs font-semibold hover:bg-red-500 transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                  Remove from stage
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToStage(source.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add to stage
                </button>
              )}
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 flex items-center justify-between">
          <span className="text-xs text-white truncate font-medium">
            {source.name}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(source.id);
            }}
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded",
              source.isVisible
                ? "bg-indigo-600 text-white"
                : "bg-gray-600 text-gray-300",
            )}
          >
            {source.isVisible ? "ON" : "OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}
