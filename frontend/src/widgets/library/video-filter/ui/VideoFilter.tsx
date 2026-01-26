"use client";

import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { VideoType } from "@/entities/video/model";

export type FilterType = "all" | VideoType;

interface VideoFilterProps {
  value: FilterType;
  onChange: (value: FilterType) => void;
}

const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "모두표시" },
  { value: "original", label: "원본영상" },
  { value: "shorts", label: "쇼츠영상" },
];

export function VideoFilter({ value, onChange }: VideoFilterProps) {
  return (
    <div className="flex gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={value === filter.value ? "default" : "outline"}
          onClick={() => onChange(filter.value)}
          className={cn(
            "transition-all",
            value === filter.value
              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50",
          )}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
