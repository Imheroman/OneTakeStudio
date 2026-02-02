"use client";

import { useEffect, useState } from "react";
import { getDashboard, type RecentStudioItem } from "@/shared/api/workspace";

export function useWorkspaceHome(userId: string) {
  const [recentStudios, setRecentStudios] = useState<RecentStudioItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<{
    connectedDestinationCount: number;
    totalStudioCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<"live" | "recording">("live");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await getDashboard();
        setRecentStudios(data.recentStudios);
        setDashboardStats({
          connectedDestinationCount: data.connectedDestinationCount,
          totalStudioCount: data.totalStudioCount,
        });
      } catch (error) {
        console.error("대시보드 조회 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [userId]);

  const openCreateDialog = (type: "live" | "recording") => {
    setCreateDialogType(type);
    setIsCreateDialogOpen(true);
  };

  return {
    recentStudios,
    dashboardStats,
    isLoading,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    createDialogType,
    openCreateDialog,
  };
}
