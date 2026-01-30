"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/shared/api/client";
import {
  ApiResponseDestinationListSchema,
  ConnectChannelResponseSchema,
  DeleteResponseSchema,
  mapDestinationListToChannels,
  type Channel,
  type PlatformType,
} from "@/entities/channel/model";

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    if (searchParams.get("success") === "true") {
      fetchChannels();
    }
  }, [searchParams]);

  const handleSelectPlatform = async (platform: PlatformType) => {
    try {
      const response = await apiClient.post(
        "/api/channels/connect",
        ConnectChannelResponseSchema,
        { platform },
      );
      window.location.href = response.authUrl;
    } catch (error: unknown) {
      console.error("채널 연결 시작 실패:", error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(
        err.response?.data?.message || "채널 연결에 실패했습니다.",
      );
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
    handleSelectPlatform,
    handleDisconnect,
  };
}
