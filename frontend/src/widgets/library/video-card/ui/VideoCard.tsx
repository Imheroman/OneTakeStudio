"use client";

import { MoreHorizontal, Play } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import type { Video } from "@/entities/video/model";

interface VideoCardProps {
  video: Video;
  onMoreClick?: (video: Video) => void;
  isDark?: boolean;
}

export function VideoCard({
  video,
  onMoreClick,
  isDark = false,
}: VideoCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/library/${video.id}`);
  };

  const statusVariant =
    video.status === "Uploaded"
      ? "secondary"
      : video.status === "Saved"
      ? "default"
      : "outline";

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative cursor-pointer gpu-layer gpu-layer-hover",
        "rounded-xl p-3 transition-all",
        isDark
          ? "bg-white/15 border border-white/20 shadow-md hover:bg-white/20"
          : "bg-white border border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300"
      )}
    >
      {/* 썸네일 */}
      <div
        className={cn(
          "relative aspect-video rounded-lg overflow-hidden mb-3",
          isDark ? "bg-black/30 ring-1 ring-white/10" : "bg-gray-100"
        )}
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center text-sm",
              isDark ? "text-gray-500" : "text-gray-400"
            )}
          >
            Thumbnail
          </div>
        )}

        {/* 재생 시간 오버레이 */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {video.duration}
        </div>

        {/* 더보기 메뉴 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white z-10" // z-index 추가 안전장치
          onClick={(e) => {
            e.stopPropagation(); // 6. 중요: 더보기 버튼 클릭 시 상세페이지 이동 막기
            onMoreClick?.(video);
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {/* 호버 시 재생 아이콘 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
          {/* pointer-events-none: 재생 아이콘이 클릭을 가로채지 않도록 함 */}
          <div className="bg-white/90 rounded-full p-3">
            <Play className="h-6 w-6 text-gray-900 fill-gray-900" />
          </div>
        </div>
      </div>

      {/* 제목 및 정보 */}
      <div className="space-y-1">
        <h3
          className={cn(
            "font-medium text-sm line-clamp-2",
            isDark ? "text-gray-100" : "text-gray-900"
          )}
        >
          {video.title}
        </h3>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-xs",
              isDark ? "text-gray-400" : "text-gray-500"
            )}
          >
            {video.date}
          </span>
          <Badge variant={statusVariant} className="text-xs">
            {video.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}
