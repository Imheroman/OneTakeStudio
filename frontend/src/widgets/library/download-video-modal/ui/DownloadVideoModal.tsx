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
import { useAuthStore } from "@/stores/useAuthStore";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.userId);

  const handleDownloadOriginal = () => {
    const url = `${BASE_URL}/api/library/videos/${video.id}/download`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${video.title}.mp4`);
    if (accessToken) {
      link.setAttribute("rel", "noopener");
      fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(userId ? { "X-User-Id": userId } : {}),
        },
      })
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          link.href = blobUrl;
          link.click();
          URL.revokeObjectURL(blobUrl);
        })
        .catch(() => {
          link.href = url;
          link.target = "_blank";
          link.click();
        });
    } else {
      link.target = "_blank";
      link.click();
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
