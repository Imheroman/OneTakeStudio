"use client";

import { useState } from "react";
import { Plus, Camera, Mic, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { Source } from "@/entities/studio/model";

interface SourcesPanelProps {
  sources: Source[];
  /** 씬이 선택된 경우에만 true. false면 소스 추가 불가(씬 우선 플로우) */
  canAddSource?: boolean;
  onAddSource: () => void;
  onSourceToggle: (sourceId: string) => void;
}

const sourceIcons: Record<string, React.ReactNode> = {
  video: <Camera className="h-4 w-4" />,
  audio: <Mic className="h-4 w-4" />,
  image: <span>🖼️</span>,
  text: <span>📝</span>,
  browser: <span>🌐</span>,
};

const sourceNames: Record<string, string> = {
  video: "웹캠",
  audio: "마이크",
  image: "이미지",
  text: "텍스트",
  browser: "브라우저",
};

export function SourcesPanel({
  sources,
  canAddSource = true,
  onAddSource,
  onSourceToggle,
}: SourcesPanelProps) {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  const toggleExpand = (sourceId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-300">소스</h3>
      <div className="space-y-2 min-h-[80px]">
        {sources.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">등록된 소스가 없습니다.</p>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="border border-gray-700 rounded-lg overflow-hidden min-h-[52px] flex items-stretch"
            >
              <div
                className="flex items-center justify-between flex-1 min-w-0 p-3 cursor-pointer hover:bg-gray-700/50 gap-2"
                onClick={() => toggleExpand(source.id)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-gray-500 transition-transform",
                      expandedSources.has(source.id) && "rotate-90",
                    )}
                  />
                  <div className="text-gray-400 shrink-0">
                    {sourceIcons[source.type] || "📦"}
                  </div>
                  <span className="text-sm font-medium text-gray-300 truncate">
                    {source.name || sourceNames[source.type] || source.type}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={source.isVisible}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSourceToggle(source.id);
                  }}
                  className={cn(
                    "shrink-0 h-7 min-w-[56px] rounded-md px-2 text-xs font-medium transition-colors",
                    source.isVisible
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : "bg-gray-600 text-gray-400 hover:bg-gray-500",
                  )}
                >
                  {source.isVisible ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {!canAddSource && (
        <p className="text-xs text-amber-500/90 py-1">
          씬을 먼저 선택하세요.
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onAddSource}
        disabled={!canAddSource}
        className="w-full bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600 disabled:opacity-50 disabled:pointer-events-none"
      >
        <Plus className="h-4 w-4 mr-2" />
        소스 추가
      </Button>
    </div>
  );
}
