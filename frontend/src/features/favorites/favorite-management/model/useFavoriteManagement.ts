"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/shared/api/client";
import {
  FavoriteListResponseSchema,
  AddFavoriteResponseSchema,
  DeleteResponseSchema,
  type Favorite,
  type UserSearchResult,
} from "@/entities/favorite/model";

export function useFavoriteManagement() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [maxCount, setMaxCount] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchFavorites = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        "/api/favorites",
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

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleInvite = async (user: UserSearchResult) => {
    try {
      await apiClient.post(
        "/api/favorites",
        AddFavoriteResponseSchema,
        { userId: user.id },
      );
      await fetchFavorites();
      setIsDialogOpen(false);
    } catch (error: unknown) {
      console.error("즐겨찾기 추가 실패:", error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(
        err.response?.data?.message || "즐겨찾기 추가에 실패했습니다.",
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 멤버를 즐겨찾기에서 제거하시겠습니까?")) {
      return;
    }
    try {
      await apiClient.delete(
        `/api/favorites/${id}`,
        DeleteResponseSchema,
      );
      fetchFavorites();
    } catch (error) {
      console.error("즐겨찾기 삭제 실패:", error);
      alert("즐겨찾기 삭제에 실패했습니다.");
    }
  };

  const existingFavoriteIds = favorites.map((f) => f.userId).filter((id): id is string => id !== undefined);
  const isMaxReached = favorites.length >= maxCount;

  return {
    favorites,
    maxCount,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    existingFavoriteIds,
    isMaxReached,
    handleInvite,
    handleDelete,
  };
}
