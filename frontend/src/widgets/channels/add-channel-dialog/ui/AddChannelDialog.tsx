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
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import type {
  PlatformType,
  PlatformInfo,
  CreateDestinationRequest,
} from "@/entities/channel/model";

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateDestination: (payload: CreateDestinationRequest) => void;
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
  onCreateDestination,
}: AddChannelDialogProps) {
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(
    null
  );
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const isDark = useResolvedTheme() === "dark";

  const resetForm = () => {
    setStep("select");
    setSelectedPlatform(null);
    setChannelId("");
    setChannelName("");
    setRtmpUrl("");
    setStreamKey("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleNext = () => {
    if (selectedPlatform) {
      setStep("form");
      if (selectedPlatform === "youtube") {
        setRtmpUrl((v) => v || "rtmp://a.rtmp.youtube.com/live2");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform || !channelId.trim()) {
      alert("플랫폼과 채널 ID는 필수입니다.");
      return;
    }
    onCreateDestination({
      platform: selectedPlatform,
      channelId: channelId.trim(),
      channelName: channelName.trim() || undefined,
      rtmpUrl: rtmpUrl.trim() || undefined,
      streamKey: streamKey.trim() || undefined,
    });
    resetForm();
    onOpenChange(false);
  };

  const selectedCardClass = isDark
    ? "border-indigo-500 bg-indigo-500/20"
    : "border-indigo-500 bg-indigo-50";
  const unselectedCardClass = isDark
    ? "border-white/20 bg-white/5 hover:border-indigo-500 hover:bg-white/10 hover:shadow-md"
    : "border-gray-200 hover:border-indigo-500 hover:shadow-md";
  const inputDarkClass = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-white/20"
    : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[500px]",
          isDark && "bg-[#0c0c0f] border-white/10 text-white"
        )}
      >
        <DialogHeader>
          <DialogTitle className={cn(isDark && "text-white/90")}>
            채널 추가
          </DialogTitle>
          <DialogDescription className={cn(isDark && "text-white/70")}>
            {step === "select"
              ? "플랫폼 선택 후 수동 등록 정보를 입력합니다."
              : "송출에 사용할 정보를 입력하세요."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <>
            <div className="grid grid-cols-2 gap-4 py-4">
              {platforms.map((platform) => (
                <Card
                  key={platform.type}
                  className={cn(
                    "cursor-pointer transition-all transition-smooth hover:shadow-md gpu-layer gpu-layer-hover",
                    selectedPlatform === platform.type
                      ? selectedCardClass
                      : unselectedCardClass
                  )}
                  onClick={() => setSelectedPlatform(platform.type)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{platform.icon}</div>
                    <h3
                      className={cn(
                        "font-semibold",
                        isDark ? "text-white/90" : "text-gray-900"
                      )}
                    >
                      {platform.name}
                    </h3>
                    {platform.description && (
                      <p
                        className={cn(
                          "text-xs mt-1",
                          isDark ? "text-white/60" : "text-gray-500"
                        )}
                      >
                        {platform.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className={cn(
                  isDark &&
                    "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                취소
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedPlatform}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                다음
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className={cn(isDark && "text-white/90")}>채널 ID *</Label>
              <Input
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="예: youtube-channel-1 또는 고유 식별자"
                required
                className={inputDarkClass}
              />
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-white/90")}>
                채널 이름 (선택)
              </Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="표시용 이름"
                className={inputDarkClass}
              />
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-white/90")}>
                RTMP URL (선택, 송출 시 필요)
              </Label>
              <Input
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                placeholder="예: rtmp://a.rtmp.youtube.com/live2"
                className={inputDarkClass}
              />
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-white/90")}>
                스트림 키 (선택, 송출 시 필요)
              </Label>
              <Input
                type="password"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="YouTube 스트림 키 등"
                className={inputDarkClass}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("select")}
                className={cn(
                  isDark &&
                    "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                이전
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                등록
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
