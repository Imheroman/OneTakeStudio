"use client";

import { Plus, CheckCircle2, XCircle } from "lucide-react";
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
    handleYouTubeOAuth,
    youtubeOAuthStatus,
    handleYouTubeOAuthRevoke,
  } = useChannelManagement();
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

      {/* YouTube 채팅 연동 (OAuth) */}
      <section
        className={cn(
          "rounded-2xl p-6 shadow-sm",
          isDark
            ? "bg-white/5 backdrop-blur-sm border border-white/10"
            : "bg-white/70 backdrop-blur-sm border border-gray-200/80"
        )}
      >
        <div className="space-y-4">
          <h2
            className={cn(
              "text-lg font-semibold",
              isDark ? "text-gray-100" : "text-gray-900"
            )}
          >
            YouTube 채팅 연동
          </h2>
          <p
            className={cn(
              "text-sm",
              isDark ? "text-gray-400" : "text-gray-600"
            )}
          >
            Google 계정을 연동하면 라이브 방송 시 YouTube 채팅을 자동으로 가져옵니다.
          </p>

          {youtubeOAuthStatus?.connected ? (
            <div className="space-y-3">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg p-3",
                  isDark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"
                )}
              >
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", isDark ? "text-green-400" : "text-green-700")}>
                    연동됨
                    {youtubeOAuthStatus.channelId && (
                      <span className={cn("ml-2 font-normal", isDark ? "text-gray-400" : "text-gray-500")}>
                        ({youtubeOAuthStatus.channelId})
                      </span>
                    )}
                  </p>
                  {youtubeOAuthStatus.expired && (
                    <p className="text-xs text-amber-500 mt-0.5">토큰이 만료되었습니다. 다시 연동해주세요.</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {youtubeOAuthStatus.expired && (
                  <Button
                    onClick={handleYouTubeOAuth}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    다시 연동
                  </Button>
                )}
                <Button
                  onClick={handleYouTubeOAuthRevoke}
                  variant="outline"
                  size="sm"
                  className={cn(
                    isDark
                      ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                      : "border-red-200 text-red-600 hover:bg-red-50"
                  )}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  연동 해제
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleYouTubeOAuth}
              variant="outline"
              className={cn(
                isDark
                  ? "border-white/20 text-white/90 hover:bg-white/10"
                  : "border-gray-300 hover:bg-gray-50"
              )}
            >
              Google 계정 연동
            </Button>
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
