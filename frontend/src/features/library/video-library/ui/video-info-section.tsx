"use client";

import { Button } from "@/shared/ui/button";
import type { VideoDetail } from "@/entities/video/model";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

interface VideoInfoSectionProps {
  video: VideoDetail;
  onDownload: () => void;
}

export const VideoInfoSection = ({
  video,
  onDownload,
}: VideoInfoSectionProps) => {
  // NOTE: Generate Shorts 버튼은 '쇼츠 생성구간' 섹션으로 이동
  const isDark = useResolvedTheme() === "dark";

  return (
    <div className="flex justify-between items-start gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        <h1
          className={`text-2xl font-bold mb-2 ${
            isDark ? "text-white/90" : "text-gray-900"
          }`}
        >
          {video.title}
        </h1>
        <p
          className={`text-xs font-medium ${
            isDark ? "text-white/60" : "text-gray-500"
          }`}
        >
          {video.date}
        </p>
        {video.description && (
          <p
            className={`mt-4 text-sm leading-relaxed max-w-2xl ${
              isDark ? "text-white/70" : "text-gray-600"
            }`}
          >
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
          className={`flex items-center gap-2 ${
            isDark
              ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
              : ""
          }`}
        >
          📥 Download
        </Button>
      </div>
    </div>
  );
};
