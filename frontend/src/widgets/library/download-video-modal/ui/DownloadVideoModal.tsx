"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import type { VideoDetail } from "@/entities/video/model";
import { getRecordingDownloadUrl } from "@/shared/api/library";

interface DownloadVideoModalProps {
  open: boolean;
  onClose: () => void;
  video: VideoDetail;
}

export function DownloadVideoModal({
  open,
  onClose,
  video,
}: DownloadVideoModalProps) {
  const handleDownloadOriginal = async () => {
    try {
      const downloadUrl = await getRecordingDownloadUrl(video.id);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `${video.title}.mp4`);
      link.setAttribute("rel", "noopener");
      link.target = "_blank";
      link.click();
    } catch (err) {
      console.error("다운로드 URL 조회 실패:", err);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Video</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">선택한 영상을 다운로드합니다.</p>
        <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
          <p className="font-medium text-sm text-gray-900 truncate">
            {video.title}
          </p>
          <p className="text-xs text-gray-500 mt-1">원본 영상</p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDownloadOriginal}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
