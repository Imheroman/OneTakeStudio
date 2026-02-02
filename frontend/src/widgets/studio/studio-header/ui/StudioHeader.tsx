"use client";

import { useState, useEffect } from "react";
import { Clock, Edit, Loader2, Radio, Square, Circle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { IconButton } from "@/shared/common";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/shared/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Checkbox } from "@/shared/ui/checkbox";
import { apiClient } from "@/shared/api/client";
import {
  ApiResponseDestinationListSchema,
  type Channel,
  mapDestinationListToChannels,
} from "@/entities/channel/model";
import { Logo } from "@/shared/ui/logo";
import { EditLockIndicator } from "@/widgets/studio/edit-lock-indicator";

interface StudioHeaderProps {
  studioTitle: string;
  studioId: string;
  onEdit?: () => void;
  onGoLive?: (destinationIds?: number[]) => Promise<void>;
  onEndLive?: () => Promise<void>;
  isLive?: boolean;
  isGoingLive?: boolean;
  isPublishing?: boolean;
  isStreamConnected?: boolean;
  isAutoRecording?: boolean;
  selectedDestinationIds?: number[];
  setSelectedDestinationIds?: (ids: number[]) => void;
  publishError?: string | null;
  isEditMode?: boolean;
  onEditModeToggle?: () => void;
  // 편집 락 관련
  isLockLoading?: boolean;
  hasLock?: boolean;
  isLockedByOther?: boolean;
  lockedByNickname?: string | null;
  onAcquireLock?: () => void;
  onReleaseLock?: () => void;
  onForceReleaseLock?: () => void;
  isStateSyncConnected?: boolean;
}

interface DestinationItem {
  id: number;
  destinationId: string;
  platform: string;
  channelName: string;
}

export function StudioHeader({
  studioTitle,
  studioId,
  onEdit,
  onGoLive,
  onEndLive,
  isLive = false,
  isGoingLive = false,
  isPublishing = false,
  isStreamConnected = false,
  isAutoRecording = false,
  selectedDestinationIds = [],
  setSelectedDestinationIds,
  publishError,
  isEditMode = true,
  onEditModeToggle,
  // 편집 락 관련
  isLockLoading = false,
  hasLock = false,
  isLockedByOther = false,
  lockedByNickname = null,
  onAcquireLock,
  onReleaseLock,
  onForceReleaseLock,
  isStateSyncConnected = true,
}: StudioHeaderProps) {
  const { user } = useAuthStore();
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [isRunning, setIsRunning] = useState(false);
  const [showGoLiveDialog, setShowGoLiveDialog] = useState(false);
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);

  // 타이머
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

  // 라이브 시작 시 타이머 시작
  useEffect(() => {
    if (isLive && !isRunning) {
      setIsRunning(true);
    } else if (!isLive && isRunning) {
      setIsRunning(false);
      setElapsedTime("00:00:00");
    }
  }, [isLive, isRunning]);

  // 채널 목록 조회
  const fetchDestinations = async () => {
    try {
      setIsLoadingDestinations(true);
      const response = await apiClient.get(
        "/api/destinations",
        ApiResponseDestinationListSchema
      );
      const items: DestinationItem[] = (response.data ?? []).map((d) => ({
        id: d.id,
        destinationId: d.destinationId,
        platform: d.platform,
        channelName: d.channelName ?? d.channelId ?? "-",
      }));
      setDestinations(items);
    } catch (error) {
      console.error("채널 목록 조회 실패:", error);
    } finally {
      setIsLoadingDestinations(false);
    }
  };

  // Go Live 버튼 클릭
  const handleGoLiveClick = () => {
    if (isLive) {
      // 이미 라이브 중이면 종료 확인
      if (confirm("라이브를 종료하시겠습니까?")) {
        onEndLive?.();
      }
    } else {
      // 라이브 시작 다이얼로그 열기
      fetchDestinations();
      setShowGoLiveDialog(true);
    }
  };

  // 채널 선택 토글
  const handleToggleDestination = (id: number) => {
    if (!setSelectedDestinationIds) return;
    if (selectedDestinationIds.includes(id)) {
      setSelectedDestinationIds(selectedDestinationIds.filter((d) => d !== id));
    } else {
      setSelectedDestinationIds([...selectedDestinationIds, id]);
    }
  };

  // 송출 시작
  const handleStartLive = async () => {
    if (selectedDestinationIds.length === 0) {
      alert("송출할 채널을 선택해주세요.");
      return;
    }
    setShowGoLiveDialog(false);
    await onGoLive?.(selectedDestinationIds);
  };

  // 플랫폼 아이콘
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube":
        return "🔴";
      case "twitch":
        return "💜";
      case "facebook":
        return "🔵";
      default:
        return "📺";
    }
  };

  return (
    <>
      <header className="h-16 bg-gray-900 text-white flex items-center justify-between gap-4 px-6 border-b border-gray-800 shrink-0 overflow-visible">
        {/* 왼쪽: 로고 및 제목 */}
        <div className="flex items-center gap-4 min-w-0 shrink">
          <Logo dark size="sm" />
          <span className="text-gray-400">|</span>
          <span className="font-semibold">{studioTitle}</span>
          {isStreamConnected && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              연결됨
            </span>
          )}
        </div>

        {/* 중앙: 시간 */}
        <div className="flex items-center gap-2 shrink-0">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className={cn("font-mono text-sm", isLive && "text-red-400")}>
            {elapsedTime}
          </span>
          {isPublishing && (
            <span className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-red-600 rounded text-xs">
              <Radio className="h-3 w-3 animate-pulse" />
              LIVE
            </span>
          )}
          {isAutoRecording && (
            <span className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-orange-600 rounded text-xs">
              <Circle className="h-3 w-3 fill-current" />
              REC
            </span>
          )}
        </div>

        {/* 오른쪽: 액션 버튼들 */}
        <div className="flex items-center gap-3 shrink-0">
          {/* 편집 락 인디케이터 */}
          {onAcquireLock && onReleaseLock && (
            <EditLockIndicator
              isLoading={isLockLoading}
              hasLock={hasLock}
              isLockedByOther={isLockedByOther}
              lockedByNickname={lockedByNickname}
              onAcquire={onAcquireLock}
              onRelease={onReleaseLock}
              canForceRelease={true}
              onForceRelease={onForceReleaseLock}
              isConnected={isStateSyncConnected}
            />
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

          <Button
            onClick={handleGoLiveClick}
            disabled={isGoingLive}
            className={cn(
              "px-6 min-w-[100px]",
              isLive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            )}
          >
            {isGoingLive ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                연결 중...
              </>
            ) : isLive ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                End Live
              </>
            ) : (
              "Go Live"
            )}
          </Button>
        </div>
      </header>

      {/* Go Live 다이얼로그 */}
      <Dialog open={showGoLiveDialog} onOpenChange={setShowGoLiveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>라이브 송출 시작</DialogTitle>
            <DialogDescription>
              송출할 채널을 선택하세요. 여러 채널에 동시 송출할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isLoadingDestinations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : destinations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>등록된 채널이 없습니다.</p>
                <p className="text-sm mt-2">
                  채널 관리 페이지에서 채널을 등록해주세요.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {destinations.map((dest) => (
                  <label
                    key={dest.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedDestinationIds.includes(dest.id)
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-gray-700 hover:border-gray-600"
                    )}
                  >
                    <Checkbox
                      checked={selectedDestinationIds.includes(dest.id)}
                      onCheckedChange={() => handleToggleDestination(dest.id)}
                    />
                    <span className="text-xl">{getPlatformIcon(dest.platform)}</span>
                    <div className="flex-1">
                      <div className="font-medium">{dest.channelName}</div>
                      <div className="text-sm text-gray-400 capitalize">
                        {dest.platform}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {publishError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {publishError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGoLiveDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleStartLive}
              disabled={selectedDestinationIds.length === 0 || isGoingLive}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isGoingLive ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  연결 중...
                </>
              ) : (
                `송출 시작 (${selectedDestinationIds.length}개 채널)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
