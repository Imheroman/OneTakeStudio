"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import type { VideoDetail } from "@/entities/video/model";

interface VideoInfoSectionProps {
  video: VideoDetail;
  onDownload: () => void;
  onSaveTrim: () => void;
  onGenerateShorts?: () => void;
}

export const VideoInfoSection = ({
  video,
  onDownload,
  onSaveTrim,
  onGenerateShorts,
}: VideoInfoSectionProps) => {
  const router = useRouter();

  const handleGenerateShorts = () => {
    if (onGenerateShorts) {
      onGenerateShorts();
    } else {
      router.push(`/library/${video.id}/shorts`);
    }
  };

  return (
    <div className="flex justify-between items-start gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{video.title}</h1>
        <p className="text-xs text-gray-500 font-medium">{video.date}</p>
        {video.description && (
          <p className="mt-4 text-gray-600 text-sm leading-relaxed max-w-2xl">
            {video.description}
          </p>
        )}
      </div>

      <div className="flex gap-3 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="flex items-center gap-2"
        >
          📥 Download
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onSaveTrim}>
          Save
        </Button>
        <Button
          type="button"
          onClick={handleGenerateShorts}
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
        >
          ✨ Generate Shorts
        </Button>
      </div>
    </div>
  );
};
