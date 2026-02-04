"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
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
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [previewTimeSec, setPreviewTimeSec] = useState<number>(0);

  const clamp = useMemo(() => {
    return (v: number) => Math.min(Math.max(v, 0), safeDuration);
  }, [safeDuration]);

  useEffect(() => {
    if (dragging == null) return;

    const handleMove = (e: PointerEvent) => {
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const ratio = rect.width > 0 ? x / rect.width : 0;
      const raw = Math.round(ratio * safeDuration);
      const v = clamp(raw);

      if (dragging === "start") {
        const newStart = Math.min(v, end - 1);
        onStartChange(newStart);
        setPreviewTimeSec(newStart);
      } else {
        const newEnd = Math.max(v, start + 1);
        onEndChange(newEnd);
        setPreviewTimeSec(newEnd);
      }
    };

    const handleUp = () => {
      setDragging(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, clamp, safeDuration, start, end, onStartChange, onEndChange]);

  const previewPct =
    dragging === "start" ? startPct : dragging === "end" ? endPct : 0;
  // 가장자리에서 잘리지 않도록 transform 조정 (오른쪽 끝: -100%, 왼쪽 끝: 0%, 중간: -50%)
  const previewTransform =
    previewPct >= 90
      ? "translate(-100%, 0)"
      : previewPct <= 10
      ? "translate(0, 0)"
      : "translate(-50%, 0)";

  useEffect(() => {
    const el = previewVideoRef.current;
    if (el && dragging && videoUrl && el.readyState >= 1) {
      el.pause();
      el.currentTime = previewTimeSec;
    }
  }, [previewTimeSec, dragging, videoUrl]);

  return (
    <div className={compact ? "pt-1" : "space-y-4"}>
      <div
        className={`flex gap-4 items-center flex-wrap ${
          compact ? "gap-2" : ""
        } ${compact ? "pl-[56px] pr-[50px]" : ""}`}
      >
        <div
          className={`flex-1 min-w-[200px] ${
            compact ? "space-y-1" : "space-y-2"
          }`}
        >
          <div
            className={`flex justify-between text-xs ${
              isDark ? "text-white/60" : "text-gray-500"
            }`}
          >
            <span>시작: {formatSec(start)}</span>
            <span>종료: {formatSec(end)}</span>
          </div>
          {/* 단일 레일 + 양쪽(시작/종료) 핸들 */}
          <div className="relative w-full h-10 select-none">
            {/* 드래그 시 포인트 위 미리보기 팝업 */}
            {dragging && videoUrl && (
              <div
                className="absolute bottom-full left-0 z-50 mb-2 pointer-events-none shrink-0"
                style={{
                  left: `${previewPct}%`,
                  transform: previewTransform,
                }}
              >
                <div
                  className={cn(
                    "rounded-lg overflow-hidden border-2 shadow-xl w-40",
                    isDark
                      ? "border-white/20 bg-black"
                      : "border-gray-200 bg-gray-900"
                  )}
                >
                  <video
                    ref={previewVideoRef}
                    src={videoUrl}
                    className="w-40 h-[90px] object-cover block"
                    muted
                    playsInline
                    preload="auto"
                    onLoadedData={(e) => {
                      const el = e.currentTarget;
                      el.pause();
                      el.currentTime = previewTimeSec;
                    }}
                  />
                  <p
                    className={cn(
                      "text-[10px] text-center py-1 font-medium",
                      isDark ? "text-white/80" : "text-white/90"
                    )}
                  >
                    {formatSec(previewTimeSec)}
                  </p>
                </div>
              </div>
            )}

            {/* 레일 */}
            <div
              ref={railRef}
              className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-lg ${
                isDark ? "bg-white/15" : "bg-gray-200"
              }`}
              // 빈 공간 클릭은 아무 반응 없도록 (드래그는 핸들에서만)
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
            {/* 선택 구간 */}
            <div
              className={`absolute top-0 bottom-0 rounded-lg ${
                isDark ? "bg-blue-500/60" : "bg-blue-500/70"
              }`}
              style={{
                left: `${startPct}%`,
                width: `${Math.max(0, endPct - startPct)}%`,
                top: "50%",
                height: "8px",
                transform: "translateY(-50%)",
              }}
            />

            {/* 시작 핸들(아이콘) */}
            <button
              type="button"
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-sm cursor-ew-resize ${
                isDark
                  ? "bg-slate-950 border border-blue-400"
                  : "bg-white border border-blue-600"
              }`}
              style={{
                left: `${startPct}%`,
                transform: "translate(-50%, -50%)",
                zIndex: 30,
              }}
              aria-label={`시작 지점: ${formatSec(start)}`}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.currentTarget as HTMLButtonElement).setPointerCapture?.(
                  e.pointerId
                );
                setDragging("start");
                setPreviewTimeSec(start);
              }}
            />

            {/* 종료 핸들(아이콘) */}
            <button
              type="button"
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-sm cursor-ew-resize ${
                isDark
                  ? "bg-slate-950 border border-blue-400"
                  : "bg-white border border-blue-600"
              }`}
              style={{
                left: `${endPct}%`,
                transform: "translate(-50%, -50%)",
                zIndex: 31,
              }}
              aria-label={`종료 지점: ${formatSec(end)}`}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.currentTarget as HTMLButtonElement).setPointerCapture?.(
                  e.pointerId
                );
                setDragging("end");
                setPreviewTimeSec(end);
              }}
            />
          </div>
          <p
            className={`text-xs ${isDark ? "text-white/60" : "text-gray-500"} ${
              compact ? "mt-1" : ""
            }`}
          >
            구간 길이: {formatSec(end - start)}
          </p>
        </div>
      </div>
    </div>
  );
}
