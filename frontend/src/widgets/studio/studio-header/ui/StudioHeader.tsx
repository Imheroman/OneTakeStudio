"use client";

import { useState, useEffect } from "react";
import { Clock, Edit, Lock, Unlock } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { IconButton } from "@/shared/common";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/shared/lib/utils";

export interface ConnectedDestinationItem {
  id: number;
  platform: string;
  channelName?: string | null;
}

interface StudioHeaderProps {
  studioTitle: string;
  onEdit?: () => void;
  onGoLive?: () => void;
  /** 송출 중일 때 방송 종료 버튼 클릭 */
  onStopLive?: () => void;
  isLive?: boolean;
  isGoLiveLoading?: boolean;
  isStopLiveLoading?: boolean;
  goLiveError?: string | null;
  /** 스튜디오 내 연동 채널 표기 (StreamYard 스타일) */
  connectedDestinations?: ConnectedDestinationItem[];
  /** 편집 모드: true = 드래그/수정 가능, false = 라이브 모드(잠금, ON/OFF·프리셋만) */
  isEditMode?: boolean;
  onEditModeToggle?: () => void;
}

function platformLabel(platform: string) {
  const p = (platform ?? "").toLowerCase();
  if (p === "youtube") return "YouTube";
  if (p === "twitch") return "Twitch";
  if (p === "facebook") return "Facebook";
  return p || "채널";
}

export function StudioHeader({
  studioTitle,
  onEdit,
  onGoLive,
  onStopLive,
  isLive = false,
  isGoLiveLoading = false,
  isStopLiveLoading = false,
  goLiveError = null,
  connectedDestinations = [],
  isEditMode = true,
  onEditModeToggle,
}: StudioHeaderProps) {
  const { user } = useAuthStore();
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isLive) setElapsedTime("00:00:00");
    setIsRunning(isLive);
  }, [isLive]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const [hours, minutes, seconds] = prev.split(":").map(Number);
        let newSeconds = seconds + 1;
        let newMinutes = minutes;
        let newHours = hours;

        if (newSeconds >= 60) {
          newSeconds = 0;
          newMinutes += 1;
        }
        if (newMinutes >= 60) {
          newMinutes = 0;
          newHours += 1;
        }

        return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}:${String(newSeconds).padStart(2, "0")}`;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleGoLive = () => {
    onGoLive?.();
  };

  return (
    <header className="h-16 bg-gray-900 text-white flex items-center justify-between px-6 border-b border-gray-800">
      {/* 왼쪽: 로고 및 제목 */}
      <div className="flex items-center gap-4">
        <span className="text-xl font-black italic text-indigo-400">OneTake</span>
        <span className="text-gray-400">|</span>
        <span className="font-semibold">{studioTitle}</span>
      </div>

      {/* 중앙: 시간 + 연동 채널 표기 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="font-mono text-sm">{elapsedTime}</span>
        </div>
        {connectedDestinations.length > 0 && (
          <div className="flex items-center gap-1.5" title="연동된 송출 채널">
            {connectedDestinations.map((d) => (
              <span
                key={d.id}
                className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300 capitalize"
              >
                {platformLabel(d.platform)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 오른쪽: 액션 버튼들 */}
      <div className="flex items-center gap-3">
        {onEditModeToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditModeToggle}
            className={cn(
              "text-gray-300 hover:text-white hover:bg-gray-800",
              !isEditMode && "text-amber-400",
            )}
            title={isEditMode ? "라이브 모드로 전환 (잠금)" : "편집 모드로 전환"}
          >
            {isEditMode ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                잠금
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                편집
              </>
            )}
          </Button>
        )}

        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}

        <IconButton
          icon={
            <Avatar>
              <AvatarFallback className="bg-gray-700 text-gray-300 font-bold">
                {user?.nickname?.[0] ?? "U"}
              </AvatarFallback>
            </Avatar>
          }
          label="Profile"
          href="/mypage"
        />

        <div className="flex flex-col items-end gap-1">
          {goLiveError && (
            <span className="text-xs text-red-400 max-w-[200px] truncate" title={goLiveError}>
              {goLiveError}
            </span>
          )}
          {isLive ? (
            <Button
              onClick={onStopLive}
              disabled={isStopLiveLoading}
              className="px-6 bg-red-600 hover:bg-red-700"
            >
              {isStopLiveLoading ? "종료 중..." : "방송 종료"}
            </Button>
          ) : (
            <Button
              onClick={handleGoLive}
              disabled={isGoLiveLoading}
              className="px-6 bg-indigo-600 hover:bg-indigo-700"
            >
              {isGoLiveLoading ? "송출 중..." : "Go Live"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
