"use client";

import { useEffect, useState, useRef } from "react";
import { getDashboard, type RecentStudioItem } from "@/shared/api/workspace";

/**
 * 워크스페이스 홈 대시보드 훅.
 * 레이스 컨디션 방지: userId 변경 또는 언마운트 후 이전 요청 응답은 무시.
 */
export function useWorkspaceHome(userId: string) {
  const [recentStudios, setRecentStudios] = useState<RecentStudioItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<{
    connectedDestinationCount: number;
    totalStudioCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogType, setCreateDialogType] = useState<"live" | "recording">("live");

  const latestRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const requestId = ++latestRef.current;
    setIsLoading(true);

    const fetchDashboard = async () => {
      try {
        const data = await getDashboard();
        if (requestId !== latestRef.current) return;
        setRecentStudios(data.recentStudios);
        setDashboardStats({
          connectedDestinationCount: data.connectedDestinationCount,
          totalStudioCount: data.totalStudioCount,
        });
      } catch (error) {
        if (requestId !== latestRef.current) return;
        console.error("대시보드 조회 실패:", error);
      } finally {
        if (requestId === latestRef.current) {
          setIsLoading(false);
        }
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
