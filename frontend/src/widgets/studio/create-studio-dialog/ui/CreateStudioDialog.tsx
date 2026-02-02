"use client";

import { useState } from "react";
import { Radio, Video, HardDrive, Cloud, ArrowRight } from "lucide-react";
import { ComingSoonModal } from "@/shared/ui/coming-soon-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import type {
  TransmissionType,
  StorageLocation,
  Platform,
} from "@/entities/studio/model";

interface CreateStudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    transmissionType: TransmissionType;
    storageLocation: StorageLocation;
    platforms: Platform[];
  }) => void;
  initialType?: "live" | "recording";
}

export function CreateStudioDialog({
  open,
  onOpenChange,
  onSubmit,
  initialType = "live",
}: CreateStudioDialogProps) {
  const [transmissionType, setTransmissionType] = useState<TransmissionType>(
    initialType === "live" ? "live" : "saved_video",
  );
  const [storageLocation, setStorageLocation] = useState<StorageLocation>("local");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonMessage, setComingSoonMessage] = useState("");

  const handlePlatformToggle = (platform: Platform) => {
    if (platform === "chzzk" || platform === "twitch") {
      setComingSoonMessage(
        "치지직/트위치 송출은 준비 중입니다. 현재는 YouTube만 지원됩니다.",
      );
      setComingSoonOpen(true);
      return;
    }
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (transmissionType === "live" && platforms.length === 0) {
      alert("최소 하나의 송출 플랫폼을 선택해주세요.");
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      transmissionType,
      storageLocation,
      platforms,
    });

    // 폼 초기화
    setTitle("");
    setDescription("");
    setPlatforms([]);
    onOpenChange(false);
  };

  const platformIcons: Record<Platform, string> = {
    youtube: "▶️",
    chzzk: "ㅊ",
    twitch: "💜",
  };

  const platformNames: Record<Platform, string> = {
    youtube: "유튜브",
    chzzk: "치지직",
    twitch: "트위치",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>스튜디오 생성</DialogTitle>
          <DialogDescription>
            새로운 스튜디오를 생성하여 라이브 스트리밍이나 녹화를 시작하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 송출 타입 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">송출 타입</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTransmissionType("live")}
                className={cn(
                  "p-4 border-2 rounded-lg transition-all text-left",
                  transmissionType === "live"
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300",
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Radio className="h-5 w-5" />
                  <span className="font-semibold">라이브 송출</span>
                </div>
                {transmissionType === "live" && (
                  <div className="h-2 w-2 bg-indigo-500 rounded-full mx-auto mt-2" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setTransmissionType("saved_video")}
                className={cn(
                  "p-4 border-2 rounded-lg transition-all text-left",
                  transmissionType === "saved_video"
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300",
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Video className="h-5 w-5" />
                  <span className="font-semibold">저장된 영상</span>
                </div>
                {transmissionType === "saved_video" && (
                  <div className="h-2 w-2 bg-indigo-500 rounded-full mx-auto mt-2" />
                )}
              </button>
            </div>
          </div>

          {/* 송출 플랫폼 (라이브 송출일 때만) */}
          {transmissionType === "live" && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">송출 플랫폼</Label>
              <div className="grid grid-cols-3 gap-3">
                {(["youtube", "chzzk", "twitch"] as Platform[]).map((platform) => {
                  const isComingSoon = platform === "chzzk" || platform === "twitch";
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => handlePlatformToggle(platform)}
                      className={cn(
                        "p-4 border-2 rounded-lg transition-all text-center relative",
                        platforms.includes(platform)
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300",
                        isComingSoon && !platforms.includes(platform) && "opacity-75",
                      )}
                      title={isComingSoon ? "준비 중" : undefined}
                    >
                      <div className="text-2xl mb-2">{platformIcons[platform]}</div>
                      <div className="text-sm font-medium">
                        {platformNames[platform]}
                        {isComingSoon && (
                          <span className="block text-xs text-amber-600 font-normal mt-0.5">
                            준비 중
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 녹화 저장 위치 (라이브/저장 모두 표시) */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">녹화 저장 위치</Label>
            <p className="text-sm text-gray-500">
              라이브 종료 후 저장 및 수동 녹화 시 파일이 저장될 위치입니다.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setStorageLocation("local")}
                className={cn(
                  "p-4 border-2 rounded-lg transition-all text-left",
                  storageLocation === "local"
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300",
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <HardDrive className="h-5 w-5" />
                  <span className="font-semibold">내 컴퓨터</span>
                </div>
                <p className="text-xs text-gray-500">
                  녹화 완료 시 자동으로 다운로드
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setComingSoonMessage(
                    "클라우드 저장은 준비 중입니다. 현재는 내 컴퓨터 저장만 지원됩니다.",
                  );
                  setComingSoonOpen(true);
                }}
                className={cn(
                  "p-4 border-2 rounded-lg transition-all text-left opacity-70",
                  "border-gray-200 hover:border-gray-300",
                )}
                title="준비 중"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Cloud className="h-5 w-5" />
                  <span className="font-semibold">클라우드</span>
                  <span className="text-xs text-amber-600 font-normal">
                    (준비 중)
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  서버에 저장
                </p>
              </button>
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              placeholder="스트리밍 제목을 입력하세요..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              placeholder="스트리밍 설명을 입력하세요..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || (transmissionType === "live" && platforms.length === 0)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            다음
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>

      <ComingSoonModal
        open={comingSoonOpen}
        onOpenChange={setComingSoonOpen}
        message={comingSoonMessage}
      />
    </Dialog>
  );
}
