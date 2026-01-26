"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import type { Channel } from "@/entities/channel/model";

interface ChannelCardProps {
  channel: Channel;
  onDisconnect?: (id: string) => void;
}

const platformIcons: Record<string, string> = {
  youtube: "▶️",
  twitch: "💜",
  facebook: "📘",
  custom_rtmp: "RT",
};

const platformNames: Record<string, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
  facebook: "Facebook",
  custom_rtmp: "Custom RTMP",
};

export function ChannelCard({ channel, onDisconnect }: ChannelCardProps) {
  const isConnected = channel.status === "connected";

  return (
    <Card className="relative">
      <CardContent className="p-6">
        {/* 플랫폼 아이콘 및 이름 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
            {platformIcons[channel.platform] || "📺"}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">
              {platformNames[channel.platform] || channel.platform}
            </h3>
            <p className="text-sm text-gray-500">{channel.accountName}</p>
          </div>
        </div>

        {/* 상태 인디케이터 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-gray-400",
              )}
            />
            <span
              className={cn(
                "text-sm font-medium",
                isConnected ? "text-green-600" : "text-gray-500",
              )}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* 연결 해제 버튼 */}
          {isConnected && onDisconnect && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDisconnect(channel.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
