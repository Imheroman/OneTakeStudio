"use client";

import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ChannelCard } from "@/widgets/channels/channel-card";
import { AddChannelDialog } from "@/widgets/channels/add-channel-dialog";
import { useChannelManagement } from "@/features/channels/channel-management";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { cn } from "@/shared/lib/utils";

export function ChannelManagement() {
  const {
    channels,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    handleCreateDestination,
    handleDisconnect,
  } = useChannelManagement();
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  return (
    <div className="max-w-6xl mx-auto">
      <section
        className={cn(
          "rounded-2xl p-6 shadow-sm",
          isDark
            ? "bg-white/5 backdrop-blur-sm border border-white/10"
            : "bg-white/70 backdrop-blur-sm border border-gray-200/80"
        )}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1
              className={cn(
                "text-2xl font-bold",
                isDark ? "text-gray-100" : "text-gray-900"
              )}
            >
              연결된 채널
            </h1>
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
                  className={cn(
                    "h-32 rounded-lg animate-pulse",
                    isDark ? "bg-white/10" : "bg-gray-100"
                  )}
                />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <div
              className={cn(
                "text-center py-12 rounded-xl",
                isDark
                  ? "text-gray-400 bg-white/5"
                  : "text-gray-500 bg-gray-50/80"
              )}
            >
              연결된 채널이 없습니다. 채널을 추가해보세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {channels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  onDisconnect={handleDisconnect}
                  isDark={isDark}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <AddChannelDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreateDestination={handleCreateDestination}
      />
    </div>
  );
}
