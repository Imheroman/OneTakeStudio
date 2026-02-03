"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiClient } from "@/shared/api/client";
import type { RecentStudio } from "@/entities/studio/model";
import { RecentStudioListResponseSchema } from "@/entities/studio/model";

/**
 * 워크스페이스 홈 대시보드 훅.
 * 레이스 컨디션 방지: userId 변경 또는 언마운트 후 이전 요청 응답은 무시.
 */
export function useWorkspaceHome(userId: string) {
  const [recentStudios, setRecentStudios] = useState<RecentStudio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<"live" | "recording">("live");
  const latestRef = useRef(0);

  const fetchRecentStudios = useCallback(async () => {
    if (!userId) return;
    const requestId = ++latestRef.current;
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        `/api/workspace/${userId}/studios/recent`,
        RecentStudioListResponseSchema,
      );
      if (requestId !== latestRef.current) return;
      setRecentStudios(response.studios);
    } catch (error) {
      if (requestId !== latestRef.current) return;
      console.error("최근 스튜디오 조회 실패:", error);
    } finally {
      if (requestId === latestRef.current) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    fetchRecentStudios();
  }, [fetchRecentStudios]);

  // 스튜디오 초대 수락 시 목록 갱신
  useEffect(() => {
    const handleInviteAccepted = () => {
      fetchRecentStudios();
    };

    window.addEventListener("studio-invite-accepted", handleInviteAccepted);
    return () => {
      window.removeEventListener("studio-invite-accepted", handleInviteAccepted);
    };
  }, [fetchRecentStudios]);

  const openCreateDialog = (type: "live" | "recording") => {
    setCreateDialogType(type);
    setIsCreateDialogOpen(true);
  };

  return {
    recentStudios,
    isLoading,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    createDialogType,
    openCreateDialog,
  };
}
