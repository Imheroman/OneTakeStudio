"use client";

import { useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { FavoriteTable } from "@/widgets/favorites/favorite-table";
import { InviteMemberDialog } from "@/widgets/favorites/invite-member-dialog";
import { apiClient } from "@/shared/api/client";
import {
  FavoriteListResponseSchema,
  AddFavoriteResponseSchema,
  DeleteResponseSchema,
  type Favorite,
  type UserSearchResult,
} from "@/entities/favorite/model";

export function FavoriteManagement() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [maxCount, setMaxCount] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        "/api/v1/favorites",
        FavoriteListResponseSchema,
      );
      setFavorites(response.favorites);
      setMaxCount(response.maxCount);
    } catch (error) {
      console.error("즐겨찾기 목록 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (user: UserSearchResult) => {
    try {
      await apiClient.post(
        "/api/v1/favorites",
        AddFavoriteResponseSchema,
        {
          userId: user.id,
        },
      );
      // 목록 새로고침
      fetchFavorites();
    } catch (error: any) {
      console.error("즐겨찾기 추가 실패:", error);
      alert(
        error.response?.data?.message || "즐겨찾기 추가에 실패했습니다.",
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 멤버를 즐겨찾기에서 제거하시겠습니까?")) {
      return;
    }

    try {
      await apiClient.delete(
        `/api/v1/favorites/${id}`,
        DeleteResponseSchema,
      );
      // 목록 새로고침
      fetchFavorites();
    } catch (error) {
      console.error("즐겨찾기 삭제 실패:", error);
      alert("즐겨찾기 삭제에 실패했습니다.");
    }
  };

  const existingFavoriteIds = favorites.map((f) => f.id);
  const isMaxReached = favorites.length >= maxCount;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
        <Button
          onClick={() => setIsDialogOpen(true)}
          disabled={isMaxReached}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* 즐겨찾기 테이블 */}
      <FavoriteTable
        favorites={favorites}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {/* 멤버 초대 다이얼로그 */}
      <InviteMemberDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onInvite={handleInvite}
        existingFavoriteIds={existingFavoriteIds}
        maxCount={maxCount}
        currentCount={favorites.length}
      />
    </div>
  );
}
