"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/shared/api/client";
import type { RecentStudio } from "@/entities/studio/model";
import { RecentStudioListResponseSchema } from "@/entities/studio/model";

export function useWorkspaceHome(userId: string) {
  const [recentStudios, setRecentStudios] = useState<RecentStudio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<"live" | "recording">("live");

  useEffect(() => {
    const fetchRecentStudios = async () => {
      try {
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
    };

    fetchRecentStudios();
  }, [userId]);

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
