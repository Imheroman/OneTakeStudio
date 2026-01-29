"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ChannelCard } from "@/widgets/channels/channel-card";
import { AddChannelDialog } from "@/widgets/channels/add-channel-dialog";
import { apiClient } from "@/shared/api/client";
import {
  ChannelListResponseSchema,
  ConnectChannelResponseSchema,
  DeleteResponseSchema,
  type Channel,
  type PlatformType,
} from "@/entities/channel/model";

export function ChannelManagement() {
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchChannels();
    
    // OAuth 콜백 성공 시 새로고침
    if (searchParams.get("success") === "true") {
      fetchChannels();
    }
  }, [searchParams]);

  const fetchChannels = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        "/api/destinations",
        ChannelListResponseSchema,
      );
      setChannels(response.channels);
    } catch (error) {
      console.error("채널 목록 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlatform = async (platform: PlatformType) => {
    try {
      // 백엔드에서 OAuth URL 생성 요청
      // 백엔드는 Client Secret을 사용하여 안전하게 OAuth URL 생성
      const response = await apiClient.post(
        "/api/channels/connect",
        ConnectChannelResponseSchema,
        { platform },
      );

      // 백엔드에서 받은 OAuth URL로 리다이렉트
      // 실제 OAuth Provider (YouTube, Twitch 등)로 이동
      window.location.href = response.authUrl;
    } catch (error: any) {
      console.error("채널 연결 시작 실패:", error);
      alert(
        error.response?.data?.message || "채널 연결에 실패했습니다.",
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
      // 목록 새로고침
      fetchChannels();
    } catch (error) {
      console.error("채널 연결 해제 실패:", error);
      alert("채널 연결 해제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Connected Channels</h1>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          채널 추가
        </Button>
      </div>

      {/* 채널 그리드 */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          연결된 채널이 없습니다. 채널을 추가해보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}

      {/* 채널 추가 다이얼로그 */}
      <AddChannelDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelectPlatform={handleSelectPlatform}
      />
    </div>
  );
}
