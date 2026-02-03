"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/shared/api/client";
import type { RecentStudio } from "@/entities/studio/model";
import { RecentStudioListResponseSchema } from "@/entities/studio/model";

export function useWorkspaceHome(userId: string) {
  const [recentStudios, setRecentStudios] = useState<RecentStudio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<"live" | "recording">("live");

  const fetchRecentStudios = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        `/api/workspace/${userId}/studios/recent`,
        RecentStudioListResponseSchema,
      );
      setRecentStudios(response.studios);
    } catch (error) {
      console.error("최근 스튜디오 조회 실패:", error);
    } finally {
      setIsLoading(false);
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
