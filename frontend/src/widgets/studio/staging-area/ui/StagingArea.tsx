"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { StagingSourceTile } from "./StagingSourceTile";
import type { Source } from "@/entities/studio/model";

interface StagingAreaProps {
  /** 백스테이지에 올라온 전체 소스 (추가 시 미리보기 노출) */
  sources: Source[];
  /** PreviewArea에 올라간 소스 ID (Add to stage 한 것만) */
  onStageSourceIds: string[];
  canAddSource: boolean;
  /** 편집 모드일 때만 드래그로 순서 변경 가능 */
  isEditMode: boolean;
  /** 소스별 공유 스트림. 백스테이지 전체 소스에 대해 생성(useSourceStreams(sources)). */
  getSourceStream?: (sourceId: string) => MediaStream | undefined;
  onReorder: (newOrder: Source[]) => void;
  onAddSource: () => void;
  onSourceToggle: (sourceId: string) => void;
  onAddToStage: (sourceId: string) => void;
  onRemoveFromStage: (sourceId: string) => void;
}

function reorderSources(sources: Source[], fromIndex: number, toIndex: number): Source[] {
  if (fromIndex === toIndex) return sources;
  const next = [...sources];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

export function StagingArea({
  sources,
  onStageSourceIds,
  canAddSource,
  isEditMode,
  getSourceStream,
  onReorder,
  onAddSource,
  onSourceToggle,
  onAddToStage,
  onRemoveFromStage,
}: StagingAreaProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((_e: React.DragEvent, index: number) => {
    setDraggingIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, _index: number) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndexStr = e.dataTransfer.getData("application/x-staging-source-index");
      const fromIndex = fromIndexStr === "" ? undefined : parseInt(fromIndexStr, 10);
      setDraggingIndex(null);
      if (fromIndex === undefined || Number.isNaN(fromIndex)) return;
      const newOrder = reorderSources(sources, fromIndex, toIndex);
      onReorder(newOrder);
    },
    [sources, onReorder],
  );

  return (
    <div className="shrink-0 rounded-lg border border-gray-700 bg-gray-800 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
          백스테이지
        </span>
        {!isEditMode && (
          <span className="text-xs text-gray-500">드래그 비활성화</span>
        )}
      </div>
      <div className="flex items-center gap-3 overflow-x-auto overflow-y-hidden py-1 min-h-[112px]">
        {sources.map((source, index) => (
          <StagingSourceTile
            key={source.id}
            source={source}
            index={index}
            isEditMode={isEditMode}
            isOnStage={onStageSourceIds.includes(source.id)}
            isDragging={draggingIndex === index}
            stream={getSourceStream?.(source.id)}
            onToggle={onSourceToggle}
            onAddToStage={onAddToStage}
            onRemoveFromStage={onRemoveFromStage}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
        {canAddSource && (
          <button
            type="button"
            onClick={onAddSource}
            className="shrink-0 w-[160px] h-[100px] rounded-lg border-2 border-dashed border-gray-600 hover:border-indigo-500 hover:bg-gray-700/50 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <Plus className="h-7 w-7" />
            <span className="text-xs font-medium">소스 추가</span>
          </button>
        )}
      </div>
    </div>
  );
}
