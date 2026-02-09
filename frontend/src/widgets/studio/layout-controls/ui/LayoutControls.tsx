"use client";

import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { LayoutType } from "@/entities/studio/model";

interface LayoutControlsProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
}

const layouts: { type: LayoutType; label: string; icon: string }[] = [
  { type: "full", label: "Full View", icon: "▦" },
  { type: "split", label: "Split Screen", icon: "▥" },
  { type: "three-grid", label: "Three-Grid", icon: "▤" },
  { type: "four-grid", label: "Four-Grid", icon: "▣" },
];

export function LayoutControls({
  currentLayout,
  onLayoutChange,
}: LayoutControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-300">
          Quick Layout:
        </span>
        <div className="flex gap-2">
          {layouts.map((layout) => (
            <Button
              key={layout.type}
              variant={currentLayout === layout.type ? "default" : "outline"}
              size="sm"
              onClick={() => onLayoutChange(layout.type)}
              className={cn(
                "min-w-[100px]",
                currentLayout === layout.type
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-600"
              )}
            >
              <span className="mr-2">{layout.icon}</span>
              {layout.label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLayoutChange("custom")}
            className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-600"
          >
            + Custom Layout
          </Button>
        </div>
      </div>
    </div>
  );
}
