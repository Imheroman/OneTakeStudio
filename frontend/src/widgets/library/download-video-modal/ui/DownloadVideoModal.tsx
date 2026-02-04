"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import type { VideoDetail } from "@/entities/video/model";
import { getRecordingDownloadUrl } from "@/shared/api/library";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

interface DownloadVideoModalProps {
  open: boolean;
  onClose: () => void;
  video: VideoDetail;
}

type DownloadOption = "original" | "clip1" | "clip2" | "clip3";

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  link.setAttribute("rel", "noopener");
  link.target = "_blank";
  link.click();
}

export function DownloadVideoModal({
  open,
  onClose,
  video,
}: DownloadVideoModalProps) {
  const isDark = useResolvedTheme() === "dark";
  const clips = video.clips ?? [];
  const clip1 = clips[0];
  const clip2 = clips[1];
  const clip3 = clips[2];

  const [selected, setSelected] = useState<Set<DownloadOption>>(
    () => new Set(["original"])
  );
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set(["original"]));
    }
  }, [open]);

  const toggle = (opt: DownloadOption) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(opt)) {
        next.delete(opt);
      } else {
        next.add(opt);
      }
      return next;
    });
  };

  const handleDownload = async () => {
    if (selected.size === 0) return;
    setDownloading(true);
    try {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      if (selected.has("original")) {
        const downloadUrl = await getRecordingDownloadUrl(video.id);
        triggerDownload(downloadUrl, `${video.title}_원본.mp4`);
        await delay(300);
      }
      if (selected.has("clip1") && clip1) {
        const url = clip1.url ?? (await getRecordingDownloadUrl(video.id));
        triggerDownload(url, `${clip1.title ?? "쇼츠1"}.mp4`);
        await delay(300);
      }
      if (selected.has("clip2") && clip2) {
        const url = clip2.url ?? (await getRecordingDownloadUrl(video.id));
        triggerDownload(url, `${clip2.title ?? "쇼츠2"}.mp4`);
        await delay(300);
      }
      if (selected.has("clip3") && clip3) {
        const url = clip3.url ?? (await getRecordingDownloadUrl(video.id));
        triggerDownload(url, `${clip3.title ?? "쇼츠3"}.mp4`);
      }
      onClose();
    } catch (err) {
      console.error("다운로드 실패:", err);
    } finally {
      setDownloading(false);
    }
  };

  const containerClass = isDark
    ? "bg-white/5 border-white/10"
    : "bg-gray-50 border-gray-200";
  const textClass = isDark ? "text-white/90" : "text-gray-900";
  const subTextClass = isDark ? "text-white/60" : "text-gray-500";
  const labelHoverClass = isDark ? "hover:bg-white/5" : "hover:bg-gray-100";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={`sm:max-w-md ${
          isDark ? "bg-[#0c0c0f] border-white/10 text-white" : ""
        }`}
      >
        <DialogHeader>
          <DialogTitle className={textClass}>Download Video</DialogTitle>
        </DialogHeader>
        <p className={`text-sm ${subTextClass}`}>
          다운로드할 영상을 선택하세요.
        </p>
        <div className={`rounded-lg border p-4 space-y-3 ${containerClass}`}>
          {/* 원본 */}
          <label
            className={`flex items-center gap-3 cursor-pointer rounded-md p-2 transition-colors ${labelHoverClass}`}
          >
            <Checkbox
              checked={selected.has("original")}
              onCheckedChange={() => toggle("original")}
            />
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm truncate ${textClass}`}>
                {video.title}
              </p>
              <p className={`text-xs ${subTextClass}`}>원본</p>
            </div>
          </label>

          {/* 쇼츠 1 */}
          {clip1 && (
            <label
              className={`flex items-center gap-3 cursor-pointer rounded-md p-2 transition-colors ${labelHoverClass}`}
            >
              <Checkbox
                checked={selected.has("clip1")}
                onCheckedChange={() => toggle("clip1")}
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${textClass}`}>
                  {clip1.title ?? "쇼츠 1"}
                </p>
                <p className={`text-xs ${subTextClass}`}>
                  쇼츠 1 {clip1.duration ? `· ${clip1.duration}` : ""}
                </p>
              </div>
            </label>
          )}

          {/* 쇼츠 2 */}
          {clip2 && (
            <label
              className={`flex items-center gap-3 cursor-pointer rounded-md p-2 transition-colors ${labelHoverClass}`}
            >
              <Checkbox
                checked={selected.has("clip2")}
                onCheckedChange={() => toggle("clip2")}
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${textClass}`}>
                  {clip2.title ?? "쇼츠 2"}
                </p>
                <p className={`text-xs ${subTextClass}`}>
                  쇼츠 2 {clip2.duration ? `· ${clip2.duration}` : ""}
                </p>
              </div>
            </label>
          )}

          {/* 쇼츠 3 */}
          {clip3 && (
            <label
              className={`flex items-center gap-3 cursor-pointer rounded-md p-2 transition-colors ${labelHoverClass}`}
            >
              <Checkbox
                checked={selected.has("clip3")}
                onCheckedChange={() => toggle("clip3")}
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${textClass}`}>
                  {clip3.title ?? "쇼츠 3"}
                </p>
                <p className={`text-xs ${subTextClass}`}>
                  쇼츠 3 {clip3.duration ? `· ${clip3.duration}` : ""}
                </p>
              </div>
            </label>
          )}

          {clips.length === 0 && (
            <p className={`text-xs ${subTextClass} py-2`}>
              생성된 쇼츠가 없습니다.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={
              isDark
                ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                : undefined
            }
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={selected.size === 0 || downloading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {downloading ? "다운로드 중..." : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
