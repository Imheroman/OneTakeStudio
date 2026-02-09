"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient, axiosInstance } from "@/shared/api/client";
import { getYouTubeAuthUrl, getOAuthStatus, revokeOAuthToken, type TokenStatus } from "@/shared/api/oauth";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  ApiResponseDestinationListSchema,
  ApiResponseDestinationSchema,
  CreateDestinationRequestSchema,
  DeleteResponseSchema,
  mapDestinationListToChannels,
  safeMapRawDestinationsToChannels,
  type Channel,
  type CreateDestinationRequest,
} from "@/entities/channel/model";

export function useChannelManagement() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [youtubeOAuthStatus, setYoutubeOAuthStatus] = useState<TokenStatus | null>(null);

  const fetchChannels = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        "/api/destinations",
        ApiResponseDestinationListSchema,
      );
      setChannels(mapDestinationListToChannels(response.data ?? []));
    } catch (error) {
      console.error("채널 목록 조회 실패:", error);
      try {
        const res = await axiosInstance.get<{ data?: unknown }>("/api/destinations");
        setChannels(safeMapRawDestinationsToChannels(res?.data?.data));
      } catch {
        // fallback 실패 시 상태 유지
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOAuthStatus = async () => {
    if (!user?.userId) return;
    try {
      const statuses = await getOAuthStatus(user.userId);
      const youtube = statuses.find((s) => s.platform === "YOUTUBE") ?? null;
      setYoutubeOAuthStatus(youtube);
    } catch {
      // 조회 실패 시 무시
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchOAuthStatus();
    if (searchParams.get("success") === "true") {
      fetchChannels();
      fetchOAuthStatus();
    }
  }, [searchParams, user?.userId]);

  const handleCreateDestination = async (payload: CreateDestinationRequest) => {
    try {
      await apiClient.post(
        "/api/destinations",
        ApiResponseDestinationSchema,
        payload,
      );
      await fetchChannels();
      setIsDialogOpen(false);
    } catch (error: unknown) {
      console.error("채널 등록 실패:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      alert(err.response?.data?.message ?? err.message ?? "채널 등록에 실패했습니다.");
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("정말 이 채널 연결을 해제하시겠습니까?")) {
      return;
    }
    try {
      await apiClient.delete(
        `/api/destinations/${id}`,
        DeleteResponseSchema,
      );
      fetchChannels();
    } catch (error) {
      console.error("채널 연결 해제 실패:", error);
      alert("채널 연결 해제에 실패했습니다.");
    }
  };

  const handleYouTubeOAuth = async () => {
    if (!user?.userId) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      const authUrl = await getYouTubeAuthUrl(user.userId);
      window.location.href = authUrl;
    } catch (error) {
      console.error("YouTube OAuth URL 요청 실패:", error);
      alert("YouTube 인증 URL을 가져오는데 실패했습니다.");
    }
  };

  const handleYouTubeOAuthRevoke = async () => {
    if (!user?.userId) return;
    if (!confirm("YouTube 채팅 연동을 해제하시겠습니까?")) return;
    try {
      await revokeOAuthToken("youtube", user.userId);
      setYoutubeOAuthStatus(null);
    } catch (error) {
      console.error("YouTube OAuth 해제 실패:", error);
      alert("연동 해제에 실패했습니다.");
    }
  };

  return {
    channels,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    fetchChannels,
    handleCreateDestination,
    handleDisconnect,
    handleYouTubeOAuth,
    youtubeOAuthStatus,
    handleYouTubeOAuthRevoke,
  };
}
