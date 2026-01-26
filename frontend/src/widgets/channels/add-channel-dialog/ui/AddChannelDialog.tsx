"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import type { PlatformType, PlatformInfo } from "@/entities/channel/model";

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPlatform: (platform: PlatformType) => void;
}

const platforms: PlatformInfo[] = [
  {
    type: "youtube",
    name: "YouTube",
    icon: "▶️",
    description: "YouTube Live로 방송하기",
  },
  {
    type: "twitch",
    name: "Twitch",
    icon: "💜",
    description: "Twitch로 방송하기",
  },
  {
    type: "facebook",
    name: "Facebook",
    icon: "📘",
    description: "Facebook Live로 방송하기",
  },
  {
    type: "custom_rtmp",
    name: "Custom RTMP",
    icon: "RT",
    description: "RTMP 서버로 방송하기",
  },
];

export function AddChannelDialog({
  open,
  onOpenChange,
  onSelectPlatform,
}: AddChannelDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(
    null,
  );

  const handleConnect = () => {
    if (selectedPlatform) {
      onSelectPlatform(selectedPlatform);
      onOpenChange(false);
      setSelectedPlatform(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>채널 추가</DialogTitle>
          <DialogDescription>플랫폼 선택</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {platforms.map((platform) => (
            <Card
              key={platform.type}
              className={cn(
                "cursor-pointer transition-all hover:border-indigo-500 hover:shadow-md",
                selectedPlatform === platform.type
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200",
              )}
              onClick={() => setSelectedPlatform(platform.type)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">{platform.icon}</div>
                <h3 className="font-semibold text-gray-900">
                  {platform.name}
                </h3>
                {platform.description && (
                  <p className="text-xs text-gray-500 mt-1">
                    {platform.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!selectedPlatform}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            연결하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
