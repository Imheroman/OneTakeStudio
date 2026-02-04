"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { AnalysisChart } from "./analysis-chart";
import { ZoomSlider } from "./zoom-slider";

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSecLong(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export interface ChartWithTrimProps {
  recordingId: string;
  durationSec: number;
  startSec: number;
  endSec: number;
  onStartChange: (v: number) => void;
  onEndChange: (v: number) => void;
  videoUrl?: string;
}

const CHART_HEIGHT = 200;
const TIME_ROW_HEIGHT = 32;

function formatTimeLabel(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0)
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getTimeTicks(visibleDurationSec: number): number[] {
  const step =
    visibleDurationSec <= 120
      ? 30
      : visibleDurationSec <= 600
      ? 60
      : visibleDurationSec <= 3600
      ? 300
      : 900;
  const ticks: number[] = [];
  for (let t = 0; t < visibleDurationSec; t += step) ticks.push(t);
  if (ticks[ticks.length - 1] !== visibleDurationSec) ticks.push(visibleDurationSec);
  return ticks;
}

export function ChartWithTrim({
  recordingId,
  durationSec,
  startSec,
  endSec,
  onStartChange,
  onEndChange,
  videoUrl,
}: ChartWithTrimProps) {
  const isDark = useResolvedTheme() === "dark";
  const safeDuration = Math.max(1, durationSec);
  const start = Math.min(startSec, safeDuration - 1);
  const end = Math.min(Math.max(endSec, start + 1), safeDuration);
  const startPct = (start / safeDuration) * 100;
  const endPct = (end / safeDuration) * 100;

  const containerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [hoverSec, setHoverSec] = useState<number | null>(null);
  const [nextClickSets, setNextClickSets] = useState<"start" | "end">("start");
  const [zoomX, setZoomX] = useState(0);
  const [zoomY, setZoomY] = useState(0);

  const clamp = useMemo(
    () => (v: number) => Math.min(Math.max(v, 0), safeDuration),
    [safeDuration]
  );

  const visibleTimeRatio = Math.max(0.2, 1 - 0.8 * zoomX);
  const visibleDuration = safeDuration * visibleTimeRatio;
  const hoverPct =
    hoverSec != null ? (hoverSec / visibleDuration) * 100 : null;

  const updateHover = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      const ratio = rect.width > 0 ? x / rect.width : 0;
      const sec = ratio * visibleDuration;
      setHoverSec(clamp(Math.round(sec)));
    },
    [visibleDuration, clamp]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => updateHover(e.clientX),
    [updateHover]
  );
  const handlePointerLeave = useCallback(() => setHoverSec(null), []);
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const ratio = rect.width > 0 ? x / rect.width : 0;
      const sec = clamp(Math.round(ratio * visibleDuration));

      if (nextClickSets === "start") {
        onStartChange(Math.min(sec, end - 1));
        setNextClickSets("end");
      } else {
        onEndChange(Math.max(sec, start + 1));
        setNextClickSets("start");
      }
    },
    [nextClickSets, clamp, visibleDuration, start, end, onStartChange, onEndChange]
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

  const timeTicks = getTimeTicks(visibleDuration);

  return (
    <div className="space-y-1">
      <div
        ref={containerRef}
        className={cn(
          "relative w-full select-none cursor-crosshair rounded-lg overflow-hidden",
          "border",
          isDark ? "bg-[#1a1a1e] border-white/10" : "bg-slate-100 border-slate-200"
        )}
        style={{ height: TIME_ROW_HEIGHT + CHART_HEIGHT }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        {/* 그래프 위: 시간대 스케일 + 세로선 + 마크 top 소형원형 */}
        <div
          className={cn(
            "absolute left-0 right-0 top-0",
            isDark ? "text-white/70" : "text-gray-600"
          )}
          style={{ height: TIME_ROW_HEIGHT }}
        >
          {timeTicks.map((sec) => {
            const pct = (sec / visibleDuration) * 100;
            return (
              <div
                key={sec}
                className="absolute top-0 flex flex-col items-center pointer-events-none"
                style={{
                  left: `${pct}%`,
                  transform: "translateX(-50%)",
                  height: TIME_ROW_HEIGHT,
                }}
              >
                {/* 막대 마크 top 소형원형 */}
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    isDark ? "bg-white/90" : "bg-gray-600"
                  )}
                />
                <div
                  className={cn(
                    "w-px flex-1 min-h-[2px]",
                    isDark ? "bg-white/15" : "bg-gray-400/50"
                  )}
                />
                <span className="text-[10px] font-medium tabular-nums leading-tight">
                  {formatTimeLabel(sec)}
                </span>
              </div>
            );
          })}
        </div>

        {/* 차트 영역 (시간 행 바로 아래) */}
        <div
          className="absolute inset-x-0 rounded-b-lg overflow-hidden"
          style={{ top: TIME_ROW_HEIGHT, height: CHART_HEIGHT }}
        >
          <AnalysisChart
            recordingId={recordingId}
            embedded
            durationOverride={safeDuration}
            hoverSec={hoverSec}
            startSec={start}
            endSec={end}
            zoomX={zoomX}
            zoomY={zoomY}
          />
        </div>

        {/* 통합 호버: 얇은 세로선 (시간 행 + 차트 전체) */}
        {hoverPct != null && (
          <>
            <div
              className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
              style={{
                left: `${hoverPct}%`,
                background: isDark
                  ? "rgba(255,255,255,0.75)"
                  : "rgba(0,0,0,0.5)",
              }}
            />
            {/* 호버 시간 라벨: 그래프 위 시간 행 영역에만 (작게) */}
            <div
              className="absolute left-0 z-20 pointer-events-none"
              style={{
                left: `${hoverPct}%`,
                top: 4,
                transform: labelTransform ?? "translate(-50%, 0)",
              }}
            >
              <span
                className={cn(
                  "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap",
                  isDark
                    ? "bg-white/20 text-white/95 border border-white/25"
                    : "bg-gray-800/95 text-white/90 border border-gray-600"
                )}
              >
                {formatSecLong(hoverSec ?? 0)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 비디오 미리보기: 그래프를 가리지 않도록 차트 아래 고정 영역에 표시 */}
      {videoUrl && hoverSec != null && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border p-2 min-h-[88px]",
            isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-gray-200"
          )}
        >
          <div
            className={cn(
              "rounded overflow-hidden border shrink-0 w-36 h-20",
              isDark ? "border-white/20" : "border-gray-300"
            )}
          >
            <video
              ref={previewVideoRef}
              src={videoUrl}
              className="w-full h-full object-cover block"
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
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              isDark ? "text-white/70" : "text-gray-600"
            )}
          >
            {formatSecLong(hoverSec ?? 0)}
          </span>
        </div>
      )}

      {/* 좌우 / 상하 배율 조절 (이미지 스타일) */}
      <div
        className={cn(
          "flex flex-col gap-3 py-2 px-1 rounded-lg",
          isDark ? "bg-white/5" : "bg-black/5"
        )}
      >
        <ZoomSlider
          label="좌우"
          value={zoomX}
          onChange={setZoomX}
          steps={10}
        />
        <ZoomSlider
          label="상하"
          value={zoomY}
          onChange={setZoomY}
          steps={10}
        />
      </div>

      {/* 하단 요약 */}
      <div
        className={cn(
          "flex justify-between items-center text-xs flex-wrap gap-2",
          isDark ? "text-white/60" : "text-gray-500"
        )}
      >
        <span>
          시작: {formatSec(start)} · 종료: {formatSec(end)} · 구간:{" "}
          {formatSec(end - start)}
        </span>
        <span className={isDark ? "text-white/40" : "text-gray-400"}>
          클릭으로 시작/종료 지점 설정
        </span>
      </div>
    </div>
  );
}
