"use client";

import { useState, useEffect, useRef } from "react";
import { Circle, Square, Video } from "lucide-react";
import { Button } from "@/shared/ui/button";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface StudioRecordingPanelProps {
  studioId: string | number;
  onClose?: () => void;
  /** 녹화 중 여부 (useStudioMain과 연동) */
  isRecordingLocal?: boolean;
  /** 녹화 시작 (하단바와 연동) */
  onStartLocalRecording?: () => void;
  /** 녹화 중지 (하단바와 연동) */
  onStopLocalRecording?: () => void;
  /** 녹화 저장 위치: LOCAL=자동 다운로드, CLOUD=서버 업로드(준비중) */
  recordingStorage?: "LOCAL" | "CLOUD";
}

export function StudioRecordingPanel({
  studioId,
  onClose,
  isRecordingLocal = false,
  onStartLocalRecording,
  onStopLocalRecording,
  recordingStorage = "LOCAL",
}: StudioRecordingPanelProps) {
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 녹화 시간 타이머 (isRecordingLocal과 동기화)
  useEffect(() => {
    if (isRecordingLocal) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecordingLocal]);

  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <span className="font-semibold text-white flex items-center gap-2">
          <Video className="h-4 w-4" />
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

      {/* 저장 위치 표시 */}
      <div className="px-3 py-2 border-b border-gray-700 bg-gray-700/30">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>저장 위치:</span>
          <span className="font-medium text-gray-200">
            {recordingStorage === "LOCAL" ? "내 컴퓨터 (자동 다운로드)" : "클라우드 (준비 중)"}
          </span>
        </div>
      </div>

      {/* 녹화 버튼 (하단바와 연동) */}
      <div className="p-3 border-b border-gray-700">
        {isRecordingLocal ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-red-400">
              <span className="animate-pulse">●</span>
              <span className="font-mono text-lg">
                {formatDuration(recordingTime)}
              </span>
              <span className="text-sm text-gray-400">녹화 중</span>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full bg-gray-600 hover:bg-gray-500"
              onClick={onStopLocalRecording}
            >
              <Square className="h-4 w-4 mr-2" />
              녹화 중지
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            className="w-full bg-red-600 hover:bg-red-700"
            onClick={onStartLocalRecording}
          >
            <Circle className="h-4 w-4 mr-2 fill-current" />
            녹화 시작
          </Button>
        )}
      </div>

      {/* 안내 메시지 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        <div className="text-gray-400 text-sm text-center py-4">
          {recordingStorage === "LOCAL" ? (
            <>
              <p className="mb-2">녹화 완료 시 자동으로 다운로드됩니다.</p>
              <p className="text-xs text-gray-500">
                브라우저 다운로드 폴더를 확인하세요.
              </p>
            </>
          ) : (
            <>
              <p className="mb-2">클라우드 저장 기능은 준비 중입니다.</p>
              <p className="text-xs text-gray-500">
                현재는 녹화 완료 시 자동으로 다운로드됩니다.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
