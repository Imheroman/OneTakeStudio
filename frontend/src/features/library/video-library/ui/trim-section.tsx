"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSecLong(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TrimSectionProps {
  durationSec: number;
  startSec: number;
  endSec: number;
  onStartChange: (v: number) => void;
  onEndChange: (v: number) => void;
  /** 차트 하단에 붙여서 하나의 그래프처럼 보이게 할 때 true */
  compact?: boolean;
  /** 드래그 시 포인트 위 미리보기 팝업에 사용할 영상 URL */
  videoUrl?: string;
}

export function TrimSection({
  durationSec,
  startSec,
  endSec,
  onStartChange,
  onEndChange,
  compact = false,
  videoUrl,
}: TrimSectionProps) {
  const isDark = useResolvedTheme() === "dark";
  const safeDuration = Math.max(1, durationSec);
  const start = Math.min(startSec, safeDuration - 1);
  const end = Math.min(Math.max(endSec, start + 1), safeDuration);
  const startPct = (start / safeDuration) * 100;
  const endPct = (end / safeDuration) * 100;

  const railRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [hoverSec, setHoverSec] = useState<number | null>(null);
  const [nextClickSets, setNextClickSets] = useState<"start" | "end">("start");

  const clamp = useMemo(() => {
    return (v: number) => Math.min(Math.max(v, 0), safeDuration);
  }, [safeDuration]);

  const hoverPct = hoverSec != null ? (hoverSec / safeDuration) * 100 : null;

  const updateHover = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      const ratio = rect.width > 0 ? x / rect.width : 0;
      setHoverSec(clamp(Math.round(ratio * safeDuration)));
    },
    [safeDuration, clamp]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      updateHover(e.clientX);
    },
    [updateHover]
  );

  const handlePointerLeave = useCallback(() => {
    setHoverSec(null);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const ratio = rect.width > 0 ? x / rect.width : 0;
      const sec = clamp(Math.round(ratio * safeDuration));

      if (nextClickSets === "start") {
        const newStart = Math.min(sec, end - 1);
        onStartChange(newStart);
        setNextClickSets("end");
      } else {
        const newEnd = Math.max(sec, start + 1);
        onEndChange(newEnd);
        setNextClickSets("start");
      }
    },
    [nextClickSets, clamp, safeDuration, start, end, onStartChange, onEndChange]
  );

  useEffect(() => {
    const el = previewVideoRef.current;
    if (el && hoverSec != null && videoUrl && el.readyState >= 1) {
      el.pause();
      el.currentTime = hoverSec;
    }
  }, [hoverSec, videoUrl]);

  const labelTransform =
    hoverPct != null
      ? hoverPct >= 90
        ? "translate(-100%, 0)"
        : hoverPct <= 10
        ? "translate(0, 0)"
        : "translate(-50%, 0)"
      : undefined;

  return (
    <div className={compact ? "pt-1" : "space-y-4"}>
      <div
        className={cn(
          "flex gap-4 items-center flex-wrap",
          compact && "gap-2",
          compact && "pl-[56px] pr-[50px]"
        )}
      >
        <div className={cn("flex-1 min-w-[200px]", compact ? "space-y-1" : "space-y-2")}>
          <div
            className={cn(
              "flex justify-between text-xs",
              isDark ? "text-white/60" : "text-gray-500"
            )}
          >
            <span>시작: {formatSec(start)}</span>
            <span>종료: {formatSec(end)}</span>
          </div>

          {/* 타임라인: 호버 시 얇은 세로선 + 시간 라벨, 클릭으로 구간 설정 */}
          <div
            ref={railRef}
            className="relative w-full h-10 select-none cursor-crosshair"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={handlePointerDown}
          >
            {/* 배경 레일 */}
            <div
              className={cn(
                "absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-lg",
                isDark ? "bg-white/15" : "bg-gray-200"
              )}
            />

            {/* 선택 구간 하이라이트 */}
            <div
              className={cn(
                "absolute top-0 bottom-0 rounded-lg",
                isDark ? "bg-blue-500/40" : "bg-blue-500/50"
              )}
              style={{
                left: `${startPct}%`,
                width: `${Math.max(0, endPct - startPct)}%`,
                top: "50%",
                height: "8px",
                transform: "translateY(-50%)",
              }}
            />

            {/* 호버 시 얇은 세로선 */}
            {hoverPct != null && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
                  style={{
                    left: `${hoverPct}%`,
                    background: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)",
                  }}
                />
                {/* 시간 라벨 (선 위쪽) */}
                <div
                  className="absolute bottom-full left-0 z-20 mb-1.5 pointer-events-none"
                  style={{
                    left: `${hoverPct}%`,
                    transform: labelTransform ?? "translate(-50%, 0)",
                  }}
                >
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
                      isDark
                        ? "bg-white/15 text-white/90 border border-white/20"
                        : "bg-gray-800/90 text-white/90 border border-gray-600"
                    )}
                  >
                    {formatSecLong(hoverSec ?? 0)}
                  </span>
                </div>
                {/* 호버 시 미리보기 영상 */}
                {videoUrl && (
                  <div
                    className="absolute bottom-full left-0 z-30 mb-8 pointer-events-none"
                    style={{
                      left: `${hoverPct}%`,
                      transform: labelTransform ?? "translate(-50%, 0)",
                    }}
                  >
                    <div
                      className={cn(
                        "rounded-lg overflow-hidden border shadow-xl w-36",
                        isDark ? "border-white/20 bg-black" : "border-gray-200 bg-gray-900"
                      )}
                    >
                      <video
                        ref={previewVideoRef}
                        src={videoUrl}
                        className="w-36 h-[80px] object-cover block"
                        muted
                        playsInline
                        preload="auto"
                        onLoadedData={(e) => {
                          const el = e.currentTarget;
                          el.pause();
                          el.currentTime = hoverSec ?? 0;
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <p
            className={cn(
              "text-xs mt-1",
              isDark ? "text-white/60" : "text-gray-500",
              compact && "mt-1"
            )}
          >
            구간 길이: {formatSec(end - start)}
            <span className={cn("ml-2", isDark ? "text-white/40" : "text-gray-400")}>
              · 클릭으로 시작/종료 지점 설정
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
