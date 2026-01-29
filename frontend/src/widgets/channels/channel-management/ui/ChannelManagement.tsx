"use client";

import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ChannelCard } from "@/widgets/channels/channel-card";
import { AddChannelDialog } from "@/widgets/channels/add-channel-dialog";
import { useChannelManagement } from "@/features/channels/channel-management";

export function ChannelManagement() {
  const {
    channels,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    handleSelectPlatform,
    handleDisconnect,
  } = useChannelManagement();

  return (
    <div className="space-y-6">
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

      <AddChannelDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelectPlatform={handleSelectPlatform}
      />
    </div>
  );
}
