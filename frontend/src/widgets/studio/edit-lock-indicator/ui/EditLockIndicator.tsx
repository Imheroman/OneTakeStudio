/**
 * 편집 락 상태 표시 컴포넌트
 * 현재 누가 편집 권한을 가지고 있는지 표시
 */
"use client";

import { Lock, LockOpen, Unlock, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

interface EditLockIndicatorProps {
  /** 락 로딩 중 */
  isLoading?: boolean;
  /** 내가 락을 보유 중인지 */
  hasLock: boolean;
  /** 다른 사람이 락을 보유 중인지 */
  isLockedByOther: boolean;
  /** 락을 보유한 사용자 닉네임 */
  lockedByNickname: string | null;
  /** 락 획득 핸들러 */
  onAcquire: () => void;
  /** 락 해제 핸들러 */
  onRelease: () => void;
  /** 강제 해제 가능 여부 (호스트 전용) */
  canForceRelease?: boolean;
  /** 강제 해제 핸들러 */
  onForceRelease?: () => void;
  /** 상태 동기화 연결 여부 */
  isConnected?: boolean;
  className?: string;
}

export function EditLockIndicator({
  isLoading = false,
  hasLock,
  isLockedByOther,
  lockedByNickname,
  onAcquire,
  onRelease,
  canForceRelease = false,
  onForceRelease,
  isConnected = true,
  className,
}: EditLockIndicatorProps) {
  // 로딩 중
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700/50", className)}>
        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-400">락 상태 확인 중...</span>
      </div>
    );
  }

  // 내가 락을 보유 중
  if (hasLock) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30">
          <Lock className="h-4 w-4 text-green-400" />
          <span className="text-sm text-green-400 font-medium">편집 중</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRelease}
          className="h-8 px-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
          title="편집 권한 해제"
        >
          <Unlock className="h-4 w-4" />
        </Button>
        {!isConnected && (
          <span className="text-xs text-yellow-500">동기화 끊김</span>
        )}
      </div>
    );
  }

  // 다른 사람이 락을 보유 중
  if (isLockedByOther) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
          <Lock className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-400">
            <span className="font-medium">{lockedByNickname || "다른 사용자"}</span>
            <span className="ml-1 text-red-400/80">편집 중</span>
          </span>
        </div>
        {canForceRelease && onForceRelease && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onForceRelease}
            className="h-8 px-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
            title="강제 해제 (호스트 권한)"
          >
            <LockOpen className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // 아무도 락을 보유하지 않음 - 편집 권한 획득 가능
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onAcquire}
      className={cn(
        "h-8 gap-2 border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 hover:border-gray-500",
        className
      )}
      title="편집 권한을 획득합니다"
    >
      <LockOpen className="h-4 w-4" />
      <span>편집 시작</span>
    </Button>
  );
}
