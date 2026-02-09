"use client";

import { useState, useEffect, useRef } from "react";
import { Circle, Square, Video, ChevronDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface StudioRecordingPanelProps {
  studioId: string;
  onClose?: () => void;
  /** 녹화 중 여부 (로컬) */
  isRecordingLocal?: boolean;
  /** 녹화 중 여부 (클라우드) */
  isRecordingCloud?: boolean;
  /** 로컬 녹화 시작 */
  onStartLocalRecording?: () => void;
  /** 로컬 녹화 중지 */
  onStopLocalRecording?: () => void;
  /** 클라우드 녹화 시작 */
  onStartCloudRecording?: () => void;
  /** 클라우드 녹화 중지 */
  onStopCloudRecording?: () => void;
}

export function StudioRecordingPanel({
  studioId,
  onClose,
  isRecordingLocal = false,
  isRecordingCloud = false,
  onStartLocalRecording,
  onStopLocalRecording,
  onStartCloudRecording,
  onStopCloudRecording,
}: StudioRecordingPanelProps) {
  const [recordingTime, setRecordingTime] = useState(0);
  const [showRecordMenu, setShowRecordMenu] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isRecording = isRecordingLocal || isRecordingCloud;
  const recordingLabel = isRecordingLocal ? "로컬 녹화 중" : "클라우드 녹화 중";

  // 녹화 시간 타이머 (로컬/클라우드 모두 동기화)
  useEffect(() => {
    if (isRecording) {
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
  }, [isRecording]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!showRecordMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRecordMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showRecordMenu]);

  const handleStopRecording = () => {
    if (isRecordingLocal) onStopLocalRecording?.();
    else if (isRecordingCloud) onStopCloudRecording?.();
  };

  const hasRecordOptions =
    onStartLocalRecording ??
    onStartCloudRecording ??
    onStopLocalRecording ??
    onStopCloudRecording;

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

      {/* 녹화 버튼 (하단바와 동일: 로컬/클라우드 선택) */}
      <div className="p-3 border-b border-gray-700">
        {hasRecordOptions && (
          <div className="space-y-2" ref={menuRef}>
            {isRecording ? (
              <>
                <div className="flex items-center justify-center gap-2 text-red-400">
                  <span className="animate-pulse">●</span>
                  <span className="font-mono text-lg">
                    {formatDuration(recordingTime)}
                  </span>
                  <span className="text-sm text-gray-400">
                    {recordingLabel}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full bg-gray-600 hover:bg-gray-500"
                  onClick={handleStopRecording}
                >
                  <Square className="h-4 w-4 mr-2" />
                  녹화 중지
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="w-full bg-red-600 hover:bg-red-700 gap-2"
                  onClick={() => setShowRecordMenu((v) => !v)}
                >
                  <Circle className="h-4 w-4 fill-current" />
                  녹화 시작
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </Button>
                {showRecordMenu && (
                  <div className="mt-2 py-1 bg-gray-700/50 border border-gray-600 rounded-lg overflow-hidden">
                    {onStartLocalRecording && (
                      <button
                        type="button"
                        onClick={() => {
                          onStartLocalRecording();
                          setShowRecordMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors"
                      >
                        로컬 녹화 (자동 다운로드)
                      </button>
                    )}
                    {onStartCloudRecording && (
                      <button
                        type="button"
                        onClick={() => {
                          onStartCloudRecording();
                          setShowRecordMenu(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors",
                          onStartLocalRecording && "border-t border-gray-600"
                        )}
                      >
                        클라우드 녹화
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 안내 메시지 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        <div className="text-gray-400 text-sm text-center py-4">
          <p className="mb-2">
            녹화 시작 시 로컬 또는 클라우드 저장을 선택할 수 있습니다.
          </p>
          <p className="text-xs text-gray-500">
            로컬: 자동 다운로드 / 클라우드: 서버에 업로드
          </p>
        </div>
      </div>
    </div>
  );
}
