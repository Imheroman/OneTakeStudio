"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StagingSourceTile } from "./StagingSourceTile";
import type { Source } from "@/entities/studio/model";

interface StagingAreaProps {
  sources: Source[];
  onStageSourceIds: string[];
  canAddSource: boolean;
  isEditMode: boolean;
  getSourceStream?: (sourceId: string) => MediaStream | undefined;
  onReorder: (newOrder: Source[]) => void;
  onAddSource: () => void;
  onSourceToggle: (sourceId: string) => void;
  onAddToStage: (sourceId: string) => void;
  onRemoveFromStage: (sourceId: string) => void;
  /** 백스테이지에서 소스 완전 제거(목록에서 삭제) */
  onRemoveSource?: (sourceId: string) => void;
}

function reorderSources(sources: Source[], fromIndex: number, toIndex: number): Source[] {
  if (fromIndex === toIndex) return sources;
  const next = [...sources];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

interface SortableStagingTileProps {
  source: Source;
  index: number;
  layerOrder?: number;
  isEditMode: boolean;
  isOnStage: boolean;
  stream?: MediaStream | null;
  onToggle: (sourceId: string) => void;
  onAddToStage: (sourceId: string) => void;
  onRemoveFromStage: (sourceId: string) => void;
  onRemoveSource?: (sourceId: string) => void;
}

function SortableStagingTile({
  source,
  index,
  layerOrder,
  isEditMode,
  isOnStage,
  stream,
  onToggle,
  onAddToStage,
  onRemoveFromStage,
  onRemoveSource,
}: SortableStagingTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: source.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="shrink-0">
      <StagingSourceTile
        source={source}
        index={index}
        layerOrder={layerOrder}
        isEditMode={isEditMode}
        isOnStage={isOnStage}
        isDragging={isDragging}
        stream={stream}
        dragHandleListeners={isEditMode ? listeners : undefined}
        dragHandleAttributes={isEditMode ? attributes : undefined}
        onToggle={onToggle}
        onAddToStage={onAddToStage}
        onRemoveFromStage={onRemoveFromStage}
        onRemoveSource={onRemoveSource}
      />
    </div>
  );
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
  onRemoveSource,
}: StagingAreaProps) {
  const displaySources = sources.filter((s) => onStageSourceIds.includes(s.id));
  const sortableIds = sources.map((s) => s.id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const fromIndex = sources.findIndex((s) => s.id === active.id);
      const toIndex = sources.findIndex((s) => s.id === over.id);
      if (fromIndex === -1 || toIndex === -1) return;
      const newOrder = reorderSources(sources, fromIndex, toIndex);
      onReorder(newOrder);
    },
    [sources, onReorder]
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
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={sortableIds}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex items-center gap-3 overflow-x-auto overflow-y-hidden py-1 min-h-[112px]">
            {sources.map((source, index) => {
              const onStageIndex = displaySources.findIndex((s) => s.id === source.id);
              const layerOrder = onStageIndex >= 0 ? onStageIndex + 1 : undefined;
              return (
                <SortableStagingTile
                  key={source.id}
                  source={source}
                  index={index}
                  layerOrder={layerOrder}
                  isEditMode={isEditMode}
                  isOnStage={onStageSourceIds.includes(source.id)}
                  stream={getSourceStream?.(source.id)}
                  onToggle={onSourceToggle}
                  onAddToStage={onAddToStage}
                  onRemoveFromStage={onRemoveFromStage}
                  onRemoveSource={onRemoveSource}
                />
              );
            })}
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
        </SortableContext>
      </DndContext>
    </div>
  );
}
