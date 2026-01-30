"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient, axiosInstance } from "@/shared/api/client";
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
      // 스키마 검증 실패 시 raw GET으로 목록만 갱신 (DB·표기 일치)
      try {
        const res = await axiosInstance.get<{ data?: unknown }>("/api/destinations");
        const raw = res?.data?.data;
        setChannels(safeMapRawDestinationsToChannels(raw));
      } catch (fallbackError) {
        console.error("채널 목록 raw 조회 실패:", fallbackError);
      }
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

  /** 수동 등록: Core POST /api/destinations */
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
      const err = error as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const message = err.response?.data?.message ?? err.message ?? "채널 등록에 실패했습니다.";
      // 409: 이미 등록된 채널 → 목록 재조회 후 DB와 표기 일치
      if (err.response?.status === 409) {
        await fetchChannels();
        setIsDialogOpen(false);
        alert(`${message}\n목록을 새로고침했습니다.`);
      } else {
        alert(message);
      }
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
