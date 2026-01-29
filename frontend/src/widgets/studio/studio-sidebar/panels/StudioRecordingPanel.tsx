"use client";

import { useState, useEffect, useCallback } from "react";
import { Circle, Square, List } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  startRecording,
  stopRecording,
  getRecordingsByStudio,
  getActiveRecording,
} from "@/shared/api/studio-recording";
import type { RecordingResponse } from "@/entities/recording/model";
import { cn } from "@/shared/lib/utils";

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface StudioRecordingPanelProps {
  studioId: number;
  onClose?: () => void;
}

export function StudioRecordingPanel({
  studioId,
  onClose,
}: StudioRecordingPanelProps) {
  const [list, setList] = useState<RecordingResponse[]>([]);
  const [active, setActive] = useState<RecordingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const [recordings, current] = await Promise.all([
        getRecordingsByStudio(studioId),
        getActiveRecording(studioId),
      ]);
      setList(recordings);
      setActive(current ?? null);
    } catch (e) {
      console.error("녹화 목록 조회 실패:", e);
    } finally {
      setLoading(false);
    }
  }, [studioId]);

  useEffect(() => {
    fetchList();
    const t = setInterval(fetchList, 5000);
    return () => clearInterval(t);
  }, [fetchList]);

  const handleStart = async () => {
    try {
      setStarting(true);
      await startRecording({ studioId });
      await fetchList();
    } catch (e) {
      console.error("녹화 시작 실패:", e);
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    try {
      setStopping(true);
      await stopRecording(studioId);
      setActive(null);
      await fetchList();
    } catch (e) {
      console.error("녹화 중지 실패:", e);
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <span className="font-semibold text-white flex items-center gap-2">
          <List className="h-4 w-4" />
          녹화
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        )}
      </div>
      <div className="p-3 border-b border-gray-700">
        {active ? (
          <Button
            type="button"
            size="sm"
            className="w-full bg-red-600 hover:bg-red-700"
            onClick={handleStop}
            disabled={stopping}
          >
            <Square className="h-4 w-4 mr-2" />
            녹화 중지
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="w-full bg-red-600 hover:bg-red-700"
            onClick={handleStart}
            disabled={starting}
          >
            <Circle className="h-4 w-4 mr-2 fill-current" />
            녹화 시작
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {loading ? (
          <div className="text-gray-400 text-sm">로딩 중...</div>
        ) : list.length === 0 ? (
          <div className="text-gray-400 text-sm">녹화된 파일이 없습니다.</div>
        ) : (
          list.map((r) => (
            <div
              key={r.recordingId}
              className="p-2 rounded border border-gray-600 bg-gray-700/50 text-sm"
            >
              <div className="text-gray-200 font-medium truncate">
                {r.fileName ?? r.recordingId}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatDate(r.startedAt)} · {formatDuration(r.durationSeconds)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
