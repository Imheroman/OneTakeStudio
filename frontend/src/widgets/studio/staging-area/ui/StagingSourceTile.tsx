"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Plus, Minus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Source } from "@/entities/studio/model";

interface StagingSourceTileProps {
  source: Source;
  index: number;
  isEditMode: boolean;
  /** PreviewArea에 올라가 있는지 (Add to stage 한 소스만 true) */
  isOnStage: boolean;
  isDragging?: boolean;
  /** 공유 스트림. 백스테이지 추가 시 바로 생성되어 미리보기 노출 */
  stream?: MediaStream | null;
  onToggle: (sourceId: string) => void;
  onAddToStage: (sourceId: string) => void;
  onRemoveFromStage: (sourceId: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, toIndex: number) => void;
}

export function StagingSourceTile({
  source,
  index,
  isEditMode,
  isOnStage,
  isDragging,
  stream: streamProp,
  onToggle,
  onAddToStage,
  onRemoveFromStage,
  onDragStart,
  onDragOver,
  onDrop,
}: StagingSourceTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // 백스테이지 추가 시 스트림 생성 → 타일에서 바로 미리보기 노출
  useEffect(() => {
    if (source.type !== "video") return;
    if (streamProp && videoRef.current) {
      videoRef.current.srcObject = streamProp;
    }
  }, [source.type, streamProp]);

  const handleDragStart = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.setData("application/x-staging-source-index", String(index));
    onDragStart(e, index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver(e, index);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(e, index);
  };

  return (
    <div
      draggable={isEditMode}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-staging-index={index}
      className={cn(
        "shrink-0 w-[160px] h-[100px] rounded-lg border overflow-hidden flex flex-col",
        "bg-gray-800 border-gray-600 hover:border-gray-500",
        isEditMode && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 border-indigo-500 ring-1 ring-indigo-500",
        !source.isVisible && "opacity-60",
        isOnStage && "ring-2 ring-indigo-500/80",
      )}
    >
      <div className="flex-1 min-h-0 relative">
        {source.type === "video" ? (
          streamProp ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700 gap-1">
              <span className="text-2xl text-gray-500">📹</span>
              <span className="text-[10px] text-gray-500">연결 중...</span>
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            <Mic className="h-8 w-8 text-gray-400" />
          </div>
        )}
        {/* 호버 시 Add to stage / Remove from stage 버튼 (StreamYard 스타일) */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
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
