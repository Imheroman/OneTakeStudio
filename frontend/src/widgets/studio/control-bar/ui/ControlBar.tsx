"use client";

import { Camera, Mic, Settings, LogOut } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

interface ControlBarProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  audioLevel?: number;
  onVideoToggle: () => void;
  onAudioToggle: () => void;
  onSettings: () => void;
  onExit: () => void;
}

export function ControlBar({
  isVideoEnabled,
  isAudioEnabled,
  audioLevel = 0,
  onVideoToggle,
  onAudioToggle,
  onSettings,
  onExit,
}: ControlBarProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-2">
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

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onAudioToggle}
          className={cn(
            "h-12 w-12",
            isAudioEnabled
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600",
          )}
        >
          <Mic className="h-5 w-5" />
        </Button>
        {isAudioEnabled && (
          <div
            className="h-10 w-2 rounded-full bg-gray-700 overflow-hidden flex flex-col justify-end"
            title="마이크 레벨"
          >
            <div
              className="w-full bg-indigo-500 transition-all duration-75 rounded-full"
              style={{ height: `${Math.round(audioLevel * 100)}%` }}
            />
          </div>
        )}
      </div>

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
