"use client";

import { useState, useEffect } from "react";
import { Clock, Edit, User } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { IconButton } from "@/shared/common";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/shared/lib/utils";

interface StudioHeaderProps {
  studioTitle: string;
  onEdit?: () => void;
  onGoLive?: () => void;
  isLive?: boolean;
}

export function StudioHeader({
  studioTitle,
  onEdit,
  onGoLive,
  isLive = false,
}: StudioHeaderProps) {
  const { user } = useAuthStore();
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [isRunning, setIsRunning] = useState(false);

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
    setIsRunning(true);
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

      {/* 중앙: 시간 */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-400" />
        <span className="font-mono text-sm">{elapsedTime}</span>
      </div>

      {/* 오른쪽: 액션 버튼들 */}
      <div className="flex items-center gap-3">
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
                {user?.name?.[0] ?? "U"}
              </AvatarFallback>
            </Avatar>
          }
          label="Profile"
          href="/mypage"
        />

        <Button
          onClick={handleGoLive}
          disabled={isLive}
          className={cn(
            "px-6",
            isLive
              ? "bg-red-600 hover:bg-red-700"
              : "bg-indigo-600 hover:bg-indigo-700",
          )}
        >
          {isLive ? "Live" : "Go Live"}
        </Button>
      </div>
    </header>
  );
}
