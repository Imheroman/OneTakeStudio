"use client";

import { useState, useEffect } from "react";
import { VideoCard } from "@/widgets/library/video-card";
import { VideoFilter, type FilterType } from "@/widgets/library/video-filter";
import { apiClient } from "@/shared/api/client";
import type { Video, VideoListResponse } from "@/entities/video/model";

export function VideoLibrary() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const url =
          filter !== "all"
            ? `/api/v1/library/videos?type=${filter}`
            : "/api/v1/library/videos";
        const response = await apiClient.get<VideoListResponse>(url);
        setVideos(response.videos);
      } catch (error) {
        console.error("비디오 목록 조회 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [filter]);

  const handleMoreClick = (video: Video) => {
    // 더보기 메뉴 처리 (추후 구현)
    console.log("More clicked:", video);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Video Library</h1>
        <VideoFilter value={filter} onChange={setFilter} />
      </div>

      {/* 비디오 그리드 */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="aspect-video bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          비디오가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onMoreClick={handleMoreClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
