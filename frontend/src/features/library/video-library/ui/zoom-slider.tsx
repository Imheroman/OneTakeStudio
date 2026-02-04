"use client";

import { useRef } from "react";
import { cn } from "@/shared/lib/utils";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

interface ZoomSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  /** 슬라이더 단계 수 (트랙 위 점 개수 - 1) */
  steps?: number;
}

const DOTS_COUNT = 5;

export function ZoomSlider({
  value,
  onChange,
  label,
  steps = 10,
}: ZoomSliderProps) {
  const isDark = useResolvedTheme() === "dark";
  const railRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!railRef.current) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      updateFromClientX(e.clientX);
    }
  };

  const updateFromClientX = (clientX: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const ratio = rect.width > 0 ? x / rect.width : 0;
    const step = 1 / steps;
    const v = Math.round(ratio / step) * step;
    onChange(Math.min(1, Math.max(0, v)));
  };

  const trackBg = isDark ? "bg-white/15" : "bg-gray-300";
  const thumbBg = "bg-white";
  const iconColor = isDark ? "text-white/70" : "text-gray-500";
  const iconBorder = isDark ? "border-white/20" : "border-gray-400";

  return (
    <div className="flex items-center gap-2 w-full">
      <span
        className={cn(
          "text-xs shrink-0 w-14",
          isDark ? "text-white/50" : "text-gray-500"
        )}
      >
        {label}
      </span>
      {/* 좌측: 축소 아이콘 (원형 테두리 + 돋보기 -) */}
      <button
        type="button"
        aria-label="축소"
        className={cn(
          "shrink-0 w-8 h-8 rounded-full border flex items-center justify-center",
          trackBg,
          iconBorder,
          "hover:opacity-90"
        )}
        onClick={() => onChange(Math.max(0, value - 0.1))}
      >
        <svg
          className={cn("w-4 h-4", iconColor)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>

      {/* 중앙: 슬라이더 트랙 + 점 + 핸들 */}
      <div
        ref={railRef}
        className={cn(
          "relative flex-1 h-2 rounded-full cursor-pointer",
          trackBg
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => (e.target as HTMLElement).releasePointerCapture?.(e.pointerId)}
        onPointerLeave={(e) => (e.target as HTMLElement).releasePointerCapture?.(e.pointerId)}
      >
        {/* 트랙 위 균일 간격 점 */}
        <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
          {Array.from({ length: DOTS_COUNT + 1 }).map((_, i) => (
            <span
              key={i}
              className="w-0.5 h-0.5 rounded-full bg-white/60"
              style={{ marginLeft: i === 0 ? 0 : undefined }}
            />
          ))}
        </div>
        {/* 핸들 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow border border-white/30 pointer-events-none"
          style={{
            left: `calc(${value * 100}% - 6px)`,
            background: thumbBg,
          }}
        />
      </div>

      {/* 우측: 확대 아이콘 (원형 테두리 + 돋보기 +) */}
      <button
        type="button"
        aria-label="확대"
        className={cn(
          "shrink-0 w-8 h-8 rounded-full border flex items-center justify-center",
          trackBg,
          iconBorder,
          "hover:opacity-90"
        )}
        onClick={() => onChange(Math.min(1, value + 0.1))}
      >
        <svg
          className={cn("w-4 h-4", iconColor)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>
    </div>
  );
}
