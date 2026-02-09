"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { getCommentAnalysis, getMarkers } from "@/shared/api/library";
import type { CommentAnalysisBucketDto } from "@/shared/api/dto/library";
import type { MarkerDto } from "@/shared/api/dto/library";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface AnalysisChartProps {
  recordingId: string;
  /** 통합 타임라인 안에 넣을 때: 여백 제거, Y축 숨김, 호버/구간 표시 */
  embedded?: boolean;
  /** 시간축 도메인 강제 (통합 시 상위 duration과 맞출 때) */
  durationOverride?: number;
  /** 호버 시 표시할 초 (통합 시 상위에서 전달) */
  hoverSec?: number | null;
  /** 선택 구간 시작/종료 초 (통합 시) */
  startSec?: number;
  endSec?: number;
  /** 좌우(시간) 배율 0~1 (0=전체, 1=확대) */
  zoomX?: number;
  /** 상하(값) 배율 0~1 (0=전체, 1=확대) */
  zoomY?: number;
}

export function AnalysisChart({
  recordingId,
  embedded = false,
  durationOverride,
  hoverSec: hoverSecProp,
  startSec: startSecProp,
  endSec: endSecProp,
  zoomX = 0,
  zoomY = 0,
}: AnalysisChartProps) {
  const [data, setData] = useState<CommentAnalysisBucketDto[]>([]);
  const [markers, setMarkers] = useState<MarkerDto[]>([]);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDark = useResolvedTheme() === "dark";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getCommentAnalysis(recordingId), getMarkers(recordingId)])
      .then(([commentRes, markersList]) => {
        if (!cancelled) {
          setData(commentRes?.buckets ?? []);
          setMarkers(markersList ?? []);
          setDurationSeconds(commentRes?.durationSeconds ?? 0);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("댓글 분석 조회 실패:", err);
          setError("댓글 분석 데이터를 불러올 수 없습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recordingId]);

  const containerClass = `w-full h-[200px] rounded-lg flex items-center justify-center border ${
    isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"
  }`;

  if (loading) {
    return (
      <div className={containerClass}>
        <p className={`${isDark ? "text-white/60" : "text-slate-500"} text-sm`}>
          로딩 중...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={containerClass}>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={containerClass}>
        <p className={`${isDark ? "text-white/60" : "text-slate-500"} text-sm`}>
          댓글 데이터가 없습니다.
        </p>
      </div>
    );
  }

  const chartData = data.map((b) => ({
    ...b,
    label: formatTime(b.timeSec),
  }));

  const maxCount = Math.max(...data.map((b) => b.count), 1);
  const chartDuration =
    durationOverride ??
    (durationSeconds > 0
      ? durationSeconds
      : data.length > 0
      ? (data[data.length - 1]?.timeSec ?? 0) + 60
      : 0);

  // 유튜브 스타일 타임라인용 색상 (다크/라이트)
  const gridStroke = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const axisStroke = isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0";
  const tickFill = isDark ? "rgba(255,255,255,0.5)" : "#64748b";
  const areaStroke = isDark ? "#818cf8" : "#6366f1";
  const areaGradientId = "analysis-area-gradient";
  const chartMargin = embedded
    ? { top: 4, right: 0, left: 0, bottom: 0 }
    : { top: 8, right: 50, left: 16, bottom: 0 };

  // 배율: 0=전체, 1=확대. 시간축은 보이는 구간 비율, Y축은 max 스케일
  const visibleTimeRatio = Math.max(0.2, 1 - 0.8 * zoomX);
  const timeDomain: [number, number] = [0, chartDuration * visibleTimeRatio];
  const yMaxRatio = Math.max(0.3, 1 - 0.7 * zoomY);
  const yDomain: [number, number] = [0, maxCount * 1.1 * yMaxRatio];

  return (
    <div className="relative w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={chartMargin}
        >
          <defs>
            <linearGradient
              id={areaGradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={areaStroke}
                stopOpacity={isDark ? 0.45 : 0.5}
              />
              <stop
                offset="100%"
                stopColor={areaStroke}
                stopOpacity={0.05}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey="timeSec"
            type="number"
            domain={embedded ? timeDomain : [0, chartDuration]}
            tickFormatter={formatTime}
            tick={{ fontSize: 11, fill: tickFill }}
            tickLine={false}
            axisLine={embedded ? false : { stroke: axisStroke }}
            interval="preserveStartEnd"
            padding={{ left: 0, right: 0 }}
            hide={embedded}
          />
          {!embedded && (
            <YAxis
              width={40}
              tick={{ fontSize: 11, fill: tickFill }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, maxCount * 1.1]}
            />
          )}
          {embedded && <YAxis width={0} domain={yDomain} hide />}
          <Tooltip
            cursor={{ stroke: axisStroke, strokeWidth: 1, strokeDasharray: "4 2" }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              const start = Number(d.timeSec ?? 0);
              const end = start + 59;
              const matchedMarkers = markers.filter(
                (m) => m.timestampSec >= start && m.timestampSec <= end
              );
              return (
                <div
                  className={`px-3 py-2 rounded-lg shadow-md border text-sm ${
                    isDark
                      ? "bg-slate-950/90 border-white/10"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <p
                    className={`font-medium ${
                      isDark ? "text-white/80" : "text-slate-700"
                    }`}
                  >
                    {formatTime(d.timeSec)} ~ {formatTime(d.timeSec + 59)}
                  </p>
                  <p
                    className={`${
                      isDark ? "text-indigo-300" : "text-indigo-600"
                    } font-semibold`}
                  >
                    댓글 {d.count}개
                  </p>
                  {matchedMarkers.length > 0 && (
                    <div
                      className={`mt-2 pt-2 border-t ${
                        isDark ? "border-white/10" : "border-slate-100"
                      }`}
                    >
                      <p
                        className={`${
                          isDark ? "text-white/50" : "text-slate-500"
                        } text-xs mb-1`}
                      >
                        북마크
                      </p>
                      <ul className="space-y-1">
                        {matchedMarkers.map((m) => (
                          <li
                            key={m.markerId}
                            className={`${
                              isDark ? "text-red-300" : "text-red-600"
                            } font-medium text-xs`}
                          >
                            {m.label ?? "북마크"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={areaStroke}
            strokeWidth={1.5}
            fill={`url(#${areaGradientId})`}
            isAnimationActive={true}
            animationDuration={400}
            animationEasing="ease-out"
          />
          {markers.map((marker) => (
            <ReferenceLine
              key={marker.markerId}
              x={marker.timestampSec}
              stroke="#ef4444"
              strokeWidth={2}
            />
          ))}
          {embedded && startSecProp != null && endSecProp != null && (
            <ReferenceArea
              x1={startSecProp}
              x2={endSecProp}
              fill={isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)"}
              stroke="#3b82f6"
              strokeOpacity={0.9}
              strokeWidth={2}
            />
          )}
          {embedded && hoverSecProp != null && (
            <ReferenceLine
              x={hoverSecProp}
              stroke={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)"}
              strokeWidth={1}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
