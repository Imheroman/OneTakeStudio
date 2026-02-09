"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Mic, Settings, LogOut, Circle, ChevronDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { VolumeMixerBar } from "./VolumeMixerBar";

export type PreviewResolution = "720p" | "1080p";

interface ControlBarProps {
  resolution?: PreviewResolution;
  onResolutionChange?: (resolution: PreviewResolution) => void;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  /** 마이크 단일 레벨 (레거시, levelHistory 우선) */
  audioLevel?: number;
  /** 음량 믹스바용 레벨 히스토리 [최신...과거] */
  levelHistory?: number[];
  onVideoToggle: () => void;
  onAudioToggle: () => void;
  onSettings: () => void;
  onExit: () => void;
  isRecordingLocal?: boolean;
  isRecordingCloud?: boolean;
  onStartLocalRecording?: () => void;
  onStopLocalRecording?: () => void;
  onStartCloudRecording?: () => void;
  onStopCloudRecording?: () => void;
}

export function ControlBar({
  resolution = "720p",
  onResolutionChange,
  isVideoEnabled,
  isAudioEnabled,
  audioLevel = 0,
  levelHistory,
  onVideoToggle,
  onAudioToggle,
  onSettings,
  onExit,
  isRecordingLocal = false,
  isRecordingCloud = false,
  onStartLocalRecording,
  onStopLocalRecording,
  onStartCloudRecording,
  onStopCloudRecording,
}: ControlBarProps) {
  const [showRecordMenu, setShowRecordMenu] = useState(false);
  const [showResolutionMenu, setShowResolutionMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const resolutionMenuRef = useRef<HTMLDivElement>(null);

  const isRecording = isRecordingLocal || isRecordingCloud;
  const recordingLabel = isRecordingLocal ? "로컬 녹화 중" : "클라우드 녹화 중";

  useEffect(() => {
    if (!showRecordMenu && !showResolutionMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setShowRecordMenu(false);
      if (resolutionMenuRef.current && !resolutionMenuRef.current.contains(target)) setShowResolutionMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showRecordMenu, showResolutionMenu]);

  const handleStopRecording = () => {
    if (isRecordingLocal) onStopLocalRecording?.();
    else if (isRecordingCloud) onStopCloudRecording?.();
  };

  return (
    <div className="flex items-center justify-center gap-4 py-2">
      {onResolutionChange && (
        <div className="relative" ref={resolutionMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResolutionMenu((v) => !v)}
            className="h-12 gap-2 bg-gray-700 text-gray-300 hover:bg-gray-600 min-w-[80px]"
            title="출력 해상도"
          >
            <span className="text-sm font-medium">{resolution}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
          {showResolutionMenu && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[100px]">
              <button
                type="button"
                onClick={() => {
                  onResolutionChange("720p");
                  setShowResolutionMenu(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm hover:bg-gray-700 rounded-t-lg",
                  resolution === "720p" ? "text-indigo-300 bg-gray-700/50" : "text-gray-200",
                )}
              >
                720p
              </button>
              <button
                type="button"
                onClick={() => {
                  onResolutionChange("1080p");
                  setShowResolutionMenu(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm hover:bg-gray-700 rounded-b-lg",
                  resolution === "1080p" ? "text-indigo-300 bg-gray-700/50" : "text-gray-200",
                )}
              >
                1080p
              </button>
            </div>
          )}
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onVideoToggle}
        className={cn(
          "h-12 w-12",
          isVideoEnabled
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-gray-700 text-gray-400 hover:bg-gray-600",
        )}
      >
        <Camera className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onAudioToggle}
          className={cn(
            "h-12 w-12 shrink-0",
            isAudioEnabled
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600",
          )}
        >
          <Mic className="h-5 w-5" />
        </Button>
        <VolumeMixerBar
          levelHistory={levelHistory ?? (isAudioEnabled ? Array(24).fill(audioLevel) : Array(24).fill(0))}
          isActive={isAudioEnabled}
          className="min-w-[180px] w-48 shrink-0"
        />
      </div>

      {(onStartLocalRecording ?? onStartCloudRecording ?? onStopLocalRecording ?? onStopCloudRecording) && (
        <div className="relative" ref={menuRef}>
          {isRecording ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStopRecording}
              className="h-12 gap-2 bg-red-600/80 text-white hover:bg-red-600"
              title={recordingLabel}
            >
              <Circle className="h-4 w-4 fill-current" />
              <span className="text-sm">녹화 중지</span>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecordMenu((v) => !v)}
                className="h-12 gap-2 bg-gray-700 text-gray-300 hover:bg-gray-600"
                title="녹화"
              >
                <Circle className="h-4 w-4" />
                <span className="text-sm">녹화</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              {showRecordMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[140px]">
                  {onStartLocalRecording && (
                    <button
                      type="button"
                      onClick={() => {
                        onStartLocalRecording();
                        setShowRecordMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 rounded-t-lg"
                    >
                      로컬 녹화
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
                        "w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700",
                        onStartLocalRecording ? "" : "rounded-t-lg",
                        "rounded-b-lg"
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

      <Button
        variant="ghost"
        size="icon"
        onClick={onSettings}
        className="h-12 w-12 bg-gray-700 text-gray-400 hover:bg-gray-600"
      >
        <Settings className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onExit}
        className="h-12 w-12 bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-300"
        title="워크스페이스로 돌아가기"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
}
