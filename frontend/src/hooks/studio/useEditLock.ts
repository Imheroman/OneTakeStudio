/**
 * 스튜디오 편집 락 훅
 * 동시 편집 방지를 위한 락 관리
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  acquireEditLock,
  releaseEditLock,
  extendEditLock,
  getEditLockStatus,
  forceReleaseEditLock,
  type EditLockResponse,
} from "@/shared/api/studio-edit-lock";

export interface UseEditLockOptions {
  studioId: string;
  userId: string;
  /** 자동으로 락 갱신 (기본: true) */
  autoExtend?: boolean;
  /** 락 갱신 주기 (ms, 기본: 2분) */
  extendInterval?: number;
  /** 락 상태 변경 콜백 */
  onLockChange?: (lock: EditLockResponse) => void;
}

export interface UseEditLockReturn {
  /** 현재 락 상태 */
  lockStatus: EditLockResponse | null;
  /** 락 로딩 중 */
  isLoading: boolean;
  /** 내가 락을 보유 중인지 */
  hasLock: boolean;
  /** 다른 사람이 락을 보유 중인지 */
  isLockedByOther: boolean;
  /** 락을 보유한 사용자 닉네임 */
  lockedByNickname: string | null;
  /** 락 획득 시도 */
  acquire: () => Promise<boolean>;
  /** 락 해제 */
  release: () => Promise<void>;
  /** 락 강제 해제 (호스트 전용) */
  forceRelease: () => Promise<void>;
  /** 락 상태 새로고침 */
  refresh: () => Promise<void>;
}

const DEFAULT_EXTEND_INTERVAL = 2 * 60 * 1000; // 2분

export function useEditLock(options: UseEditLockOptions): UseEditLockReturn {
  const {
    studioId,
    userId,
    autoExtend = true,
    extendInterval = DEFAULT_EXTEND_INTERVAL,
    onLockChange,
  } = options;

  const [lockStatus, setLockStatus] = useState<EditLockResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const extendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 락 상태 조회
  const refresh = useCallback(async () => {
    if (!studioId) return;

    try {
      const status = await getEditLockStatus(studioId);
      setLockStatus(status);
      onLockChange?.(status);
    } catch (error) {
      console.error("[EditLock] 락 상태 조회 실패:", error);
    }
  }, [studioId, onLockChange]);

  // 락 획득
  const acquire = useCallback(async (): Promise<boolean> => {
    if (!studioId) return false;

    setIsLoading(true);
    try {
      const response = await acquireEditLock(studioId);
      setLockStatus(response);
      onLockChange?.(response);
      return response.isMyLock;
    } catch (error: unknown) {
      // 409 Conflict - 다른 사람이 락을 보유 중
      const axiosError = error as { response?: { status: number; data?: { data?: EditLockResponse } } };
      if (axiosError.response?.status === 409) {
        const conflictData = axiosError.response.data?.data;
        if (conflictData) {
          setLockStatus(conflictData);
          onLockChange?.(conflictData);
        }
      }
      console.error("[EditLock] 락 획득 실패:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [studioId, onLockChange]);

  // 락 해제
  const release = useCallback(async () => {
    if (!studioId) return;

    try {
      await releaseEditLock(studioId);
      setLockStatus({ locked: false, isMyLock: false });
      onLockChange?.({ locked: false, isMyLock: false });
    } catch (error) {
      console.error("[EditLock] 락 해제 실패:", error);
    }
  }, [studioId, onLockChange]);

  // 락 강제 해제
  const forceRelease = useCallback(async () => {
    if (!studioId) return;

    try {
      await forceReleaseEditLock(studioId);
      setLockStatus({ locked: false, isMyLock: false });
      onLockChange?.({ locked: false, isMyLock: false });
    } catch (error) {
      console.error("[EditLock] 락 강제 해제 실패:", error);
    }
  }, [studioId, onLockChange]);

  // 락 갱신 (heartbeat)
  const extend = useCallback(async () => {
    if (!studioId) return;
    if (!lockStatus?.isMyLock) return;

    try {
      const response = await extendEditLock(studioId);
      setLockStatus(response);
    } catch (error) {
      console.error("[EditLock] 락 갱신 실패:", error);
      // 갱신 실패 시 상태 새로고침
      refresh();
    }
  }, [studioId, lockStatus?.isMyLock, refresh]);

  // 초기 락 상태 조회
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 자동 락 갱신
  useEffect(() => {
    if (!autoExtend || !lockStatus?.isMyLock) {
      if (extendTimerRef.current) {
        clearInterval(extendTimerRef.current);
        extendTimerRef.current = null;
      }
      return;
    }

    extendTimerRef.current = setInterval(extend, extendInterval);

    return () => {
      if (extendTimerRef.current) {
        clearInterval(extendTimerRef.current);
        extendTimerRef.current = null;
      }
    };
  }, [autoExtend, lockStatus?.isMyLock, extendInterval, extend]);

  // 언마운트 시 락 해제
  useEffect(() => {
    return () => {
      if (lockStatus?.isMyLock) {
        releaseEditLock(studioId).catch(() => {});
      }
    };
  }, [studioId, lockStatus?.isMyLock]);

  return {
    lockStatus,
    isLoading,
    hasLock: lockStatus?.isMyLock ?? false,
    isLockedByOther: (lockStatus?.locked && !lockStatus?.isMyLock) ?? false,
    lockedByNickname: lockStatus?.lockedByNickname ?? null,
    acquire,
    release,
    forceRelease,
    refresh,
  };
}
