"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient, axiosInstance } from "@/shared/api/client";
import { z } from "zod";
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

const InternalUserIdResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({ internalUserId: z.number() }),
});

const OAuthAuthorizeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({ authUrl: z.string() }),
});

export function useChannelManagement() {
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  useEffect(() => {
    fetchChannels();
    if (searchParams.get("success") === "true") fetchChannels();
  }, [searchParams]);

  const handleCreateDestination = async (payload: CreateDestinationRequest) => {
    try {
      await apiClient.post(
        "/api/destinations",
        ApiResponseDestinationSchema,
        payload,
      );
      await fetchChannels();
      setIsDialogOpen(false);

      // YouTube 채널이면 채팅 연동을 위한 OAuth 인증 시작
      if (payload.platform.toLowerCase() === "youtube") {
        try {
          // 1) Core Service에서 내부 userId 조회
          const userRes = await apiClient.get(
            "/api/destinations/oauth/internal-user-id",
            InternalUserIdResponseSchema,
          );
          const internalUserId = userRes.data?.internalUserId;
          if (internalUserId == null) throw new Error("내부 userId 조회 실패");

          // 2) Media Service OAuth 인증 URL 조회 (gateway 경유)
          const oauthRes = await apiClient.get(
            `/api/oauth/youtube/authorize?userId=${internalUserId}`,
            OAuthAuthorizeResponseSchema,
          );
          if (oauthRes.data?.authUrl) {
            window.location.href = oauthRes.data.authUrl;
            return;
          }
        } catch (oauthError) {
          console.warn("YouTube OAuth 인증 시작 실패 (채널은 등록됨):", oauthError);
        }
      }
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

  return {
    channels,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    fetchChannels,
    handleCreateDestination,
    handleDisconnect,
  };
}
