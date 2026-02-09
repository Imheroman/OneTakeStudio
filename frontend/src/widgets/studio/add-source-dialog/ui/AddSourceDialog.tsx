"use client";

import { useState, useCallback } from "react";
import { Camera, Mic, Monitor } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useEnumerateDevices } from "@/hooks/studio";
import { cn } from "@/shared/lib/utils";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** type와 선택한 deviceId 전달. screen은 deviceId 없음. */
  onSelect: (type: "video" | "audio" | "screen", deviceId?: string) => void;
}

/** 권한 허용 시 장치 라벨이 채워지도록 한 번만 미디어 접근 요청 */
async function requestDevicePermission(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // 사용자가 거부해도 enumerateDevices는 호출 가능
  }
}

export function AddSourceDialog({
  open,
  onOpenChange,
  onSelect,
}: AddSourceDialogProps) {
  const { videoDevices, audioDevices, isLoading, error, refresh } =
    useEnumerateDevices({ enabled: open });

  const [permLoading, setPermLoading] = useState(false);
  const handleRequestPermission = useCallback(async () => {
    setPermLoading(true);
    try {
      await requestDevicePermission();
      await refresh();
    } finally {
      setPermLoading(false);
    }
  }, [refresh]);

  const handleSelectVideo = (deviceId: string) => {
    onSelect("video", deviceId);
    onOpenChange(false);
  };

  const handleSelectAudio = (deviceId: string) => {
    onSelect("audio", deviceId);
    onOpenChange(false);
  };

  const noDevices =
    !isLoading &&
    !error &&
    videoDevices.length === 0 &&
    audioDevices.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 max-h-[90vh] overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-gray-100">소스 추가</DialogTitle>
        </DialogHeader>

        {error && (
          <p className="text-sm text-red-400 shrink-0">
            장치 목록을 불러올 수 없습니다. {error.message}
          </p>
        )}

        {isLoading ? (
          <div className="py-6 text-center text-gray-400 text-sm shrink-0">
            장치 목록 불러오는 중…
          </div>
        ) : (
          <div className="grid gap-4 py-2 overflow-y-auto min-h-0 max-h-[50vh]">
            {/* 화면 공유 */}
            <section className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2 shrink-0">
                <Monitor className="h-4 w-4" />
                화면 공유
              </h3>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-10 justify-start gap-2",
                  "bg-gray-700 border-gray-600 text-gray-200",
                  "hover:bg-gray-600 hover:border-gray-500"
                )}
                onClick={() => {
                  onSelect("screen");
                  // 화면 공유: 부모에서 publish(선택 창) 완료 후 닫음. 여기서 닫으면 getDisplayMedia 사용자 제스처 손실
                }}
              >
                <Monitor className="h-4 w-4 shrink-0" />
                <span>화면 공유 추가</span>
              </Button>
            </section>

            {/* 비디오 소스 */}
            <section className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2 shrink-0">
                <Camera className="h-4 w-4" />
                비디오 (웹캠)
              </h3>
              {videoDevices.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                  사용 가능한 카메라가 없습니다.
                </p>
              ) : (
                <ul className="space-y-1">
                  {videoDevices.map((d) => (
                    <li key={d.deviceId}>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start gap-2 min-w-0",
                          "bg-gray-700 border-gray-600 text-gray-200",
                          "hover:bg-gray-600 hover:border-gray-500"
                        )}
                        onClick={() => handleSelectVideo(d.deviceId)}
                      >
                        <Camera className="h-4 w-4 shrink-0" />
                        <span className="truncate min-w-0">{d.label}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 오디오 소스 */}
            <section className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2 shrink-0">
                <Mic className="h-4 w-4" />
                오디오 (마이크)
              </h3>
              {audioDevices.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                  사용 가능한 마이크가 없습니다.
                </p>
              ) : (
                <ul className="space-y-1">
                  {audioDevices.map((d) => (
                    <li key={d.deviceId}>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start gap-2 min-w-0",
                          "bg-gray-700 border-gray-600 text-gray-200",
                          "hover:bg-gray-600 hover:border-gray-500"
                        )}
                        onClick={() => handleSelectAudio(d.deviceId)}
                      >
                        <Mic className="h-4 w-4 shrink-0" />
                        <span className="truncate min-w-0">{d.label}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {noDevices && (
          <div className="shrink-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-gray-600 text-gray-300"
              onClick={handleRequestPermission}
              disabled={permLoading}
            >
              {permLoading
                ? "권한 요청 중…"
                : "카메라·마이크 권한 허용 후 목록 새로고침"}
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-200"
            onClick={() => refresh()}
          >
            목록 새로고침
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
