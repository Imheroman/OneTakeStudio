"use client";

import { MoreHorizontal, Play } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useRouter } from "next/navigation"; // 1. useRouter 추가
import type { Video } from "@/entities/video/model";

interface VideoCardProps {
  video: Video;
  onMoreClick?: (video: Video) => void;
}

export function VideoCard({ video, onMoreClick }: VideoCardProps) {
  const router = useRouter(); // 2. 라우터 훅 사용

  // 3. 카드 전체 클릭 시 실행될 함수
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
      onClick={handleCardClick} // 4. 전체 컨테이너에 클릭 이벤트 연결
      className="group relative cursor-pointer gpu-layer gpu-layer-hover" // 5. 마우스 커서 손가락 모양 추가
    >
      {/* 썸네일 */}
      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-sm">Thumbnail</span>
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
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
          {video.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{video.date}</span>
          <Badge variant={statusVariant} className="text-xs">
            {video.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}
