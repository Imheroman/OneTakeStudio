"use client";

import { useState } from "react";
import { Plus, Camera, Mic, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { Source } from "@/entities/studio/model";

interface SourcesPanelProps {
  sources: Source[];
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
  video: "Video Capture Device",
  audio: "Audio Input Capture",
  image: "Image Source",
  text: "Text Source",
  browser: "Browser Source",
};

export function SourcesPanel({
  sources,
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
      <h3 className="text-sm font-semibold text-gray-300">Sources</h3>
      <div className="space-y-2">
        {sources.map((source) => (
          <div
            key={source.id}
            className="border border-gray-700 rounded-lg overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-700/50"
              onClick={() => toggleExpand(source.id)}
            >
              <div className="flex items-center gap-2">
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-gray-500 transition-transform",
                    expandedSources.has(source.id) && "rotate-90",
                  )}
                />
                <div className="text-gray-400">
                  {sourceIcons[source.type] || "📦"}
                </div>
                <span className="text-sm font-medium text-gray-300">
                  {sourceNames[source.type] || source.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSourceToggle(source.id);
                }}
                className={cn(
                  "h-6 px-2 text-xs",
                  source.isVisible
                    ? "text-indigo-400 hover:text-indigo-300"
                    : "text-gray-500 hover:text-gray-400",
                )}
              >
                {source.isVisible ? "ON" : "OFF"}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onAddSource}
        className="w-full bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Source
      </Button>
    </div>
  );
}
