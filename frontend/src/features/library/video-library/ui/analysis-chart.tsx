"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
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
}

export function AnalysisChart({ recordingId }: AnalysisChartProps) {
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
          setData(commentRes.buckets ?? []);
          setMarkers(markersList ?? []);
          setDurationSeconds(commentRes.durationSeconds ?? 0);
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
    durationSeconds > 0
      ? durationSeconds
      : data.length > 0
      ? (data[data.length - 1]?.timeSec ?? 0) + 60
      : 0;

  return (
    <div className="relative w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 50, left: 16, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="timeSec"
            type="number"
            domain={[0, chartDuration]}
            tickFormatter={formatTime}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            interval="preserveStartEnd"
            padding={{ left: 0, right: 0 }}
          />
          <YAxis
            width={40}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            domain={[0, maxCount * 1.1]}
          />
          <Tooltip
            cursor={false}
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
          <Bar
            dataKey="count"
            radius={[2, 2, 0, 0]}
            maxBarSize={24}
            activeBar={false}
          >
            {chartData.map((_, index) => (
              <Cell
                key={index}
                fill="#6366f1"
                fillOpacity={0.7 + (chartData[index].count / maxCount) * 0.3}
              />
            ))}
          </Bar>
          {markers.map((marker) => (
            <ReferenceLine
              key={marker.markerId}
              x={marker.timestampSec}
              stroke="#ef4444"
              strokeWidth={2}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
