"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Circle, Square, Video } from "lucide-react";
import { Button } from "@/shared/ui/button";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateTimeForFile(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const sec = String(date.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}_${h}${min}${sec}`;
}

interface StudioRecordingPanelProps {
  studioId: number;
  onClose?: () => void;
  /** 캔버스 스트림을 가져오는 함수 */
  getPreviewStream?: () => MediaStream | null;
  /** 녹화 저장 위치: LOCAL=자동 다운로드, CLOUD=서버 업로드(준비중) */
  recordingStorage?: "LOCAL" | "CLOUD";
}

export function StudioRecordingPanel({
  studioId,
  onClose,
  getPreviewStream,
  recordingStorage = "LOCAL",
}: StudioRecordingPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 녹화 시작
  const handleStart = useCallback(() => {
    const stream = getPreviewStream?.();
    if (!stream || stream.getVideoTracks().length === 0) {
      console.warn("녹화: 캔버스 스트림을 사용할 수 없습니다.");
      alert("녹화할 수 있는 화면이 없습니다. 먼저 소스를 추가해주세요.");
      return;
    }

    try {
      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });

        if (recordingStorage === "LOCAL") {
          // 로컬: 자동 다운로드 + 목록에 추가
          const fileName = `녹화_${formatDateTimeForFile(new Date())}.webm`;

          // 자동 다운로드
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // 목록에는 추가하지만 blob은 저장 안함 (메모리 절약)
          // saveRecording(studioId, blob, mimeType);
          console.log("녹화 완료: 자동 다운로드됨 -", fileName);
        } else {
          // 클라우드: 서버 업로드 (TODO: 서버 준비되면 구현)
          console.log("클라우드 저장 기능은 준비 중입니다.");
          alert("클라우드 저장 기능은 아직 준비 중입니다. 로컬 저장으로 변경해주세요.");

          // 임시로 다운로드 제공
          const fileName = `녹화_${formatDateTimeForFile(new Date())}.webm`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        recordedChunksRef.current = [];
      };

      recorder.start(1000); // 1초마다 데이터 수집
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      // 녹화 시간 타이머
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log("녹화 시작");
    } catch (err) {
      console.error("녹화 시작 실패:", err);
      alert("녹화를 시작할 수 없습니다.");
    }
  }, [getPreviewStream, recordingStorage]);

  // 녹화 중지
  const handleStop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      mediaRecorderRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);
    console.log("녹화 중지");
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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

      {/* 녹화 버튼 */}
      <div className="p-3 border-b border-gray-700">
        {isRecording ? (
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
              onClick={handleStop}
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
            onClick={handleStart}
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
