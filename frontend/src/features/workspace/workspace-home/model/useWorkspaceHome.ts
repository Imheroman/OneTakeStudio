"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiClient } from "@/shared/api/client";
import { deleteStudio } from "@/shared/api/studio";
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
  const [createDialogType, setCreateDialogType] = useState<
    "live" | "recording"
  >("live");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const latestRef = useRef(0);

  const fetchRecentStudios = useCallback(async () => {
    if (!userId) return;
    const requestId = ++latestRef.current;
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        `/api/workspace/${userId}/studios/recent`,
        RecentStudioListResponseSchema
      );
      if (requestId !== latestRef.current) return;
      setRecentStudios(response.studios);
    } catch (error) {
      if (requestId !== latestRef.current) return;
      console.error("스튜디오 목록 조회 실패:", error);
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
      window.removeEventListener(
        "studio-invite-accepted",
        handleInviteAccepted
      );
    };
  }, [fetchRecentStudios]);

  const handleDeleteStudio = useCallback(
    async (studioId: number) => {
      if (
        !confirm(
          "정말 이 스튜디오를 삭제하시겠습니까? 삭제된 스튜디오는 복구할 수 없습니다."
        )
      ) {
        return;
      }
      try {
        setDeletingId(studioId);
        await deleteStudio(studioId);
        await fetchRecentStudios();
      } catch (error) {
        console.error("스튜디오 삭제 실패:", error);
        alert("스튜디오 삭제에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setDeletingId(null);
      }
    },
    [fetchRecentStudios]
  );

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
    handleDeleteStudio,
    deletingId,
  };
}
