"use client";

import { useState, useEffect } from "react";
import { VideoCard } from "@/widgets/library/video-card";
import { VideoFilter, type FilterType } from "@/widgets/library/video-filter";
import { UploadVideoModal } from "@/widgets/library/upload-video-modal";
import { apiClient } from "@/shared/api/client";
import { VideoListApiResponseSchema, type Video } from "@/entities/video/model";
import { Button } from "@/shared/ui/button";
import { Upload } from "lucide-react";

interface VideoLibraryProps {
  /** 업로드 시에만 사용(선택). 없으면 전체 영상 목록만 표시 */
  studioId?: string;
}

export function VideoLibrary({ studioId }: VideoLibraryProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // 사용자 전체 영상 목록 조회 (studioId 없이). 필터만 적용
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (filter !== "all") params.set("type", filter);
        const url = params.toString()
          ? `/api/library/videos?${params.toString()}`
          : "/api/library/videos";
        const response = await apiClient.get(url, VideoListApiResponseSchema);
        setVideos(response.data.videos);
      } catch (error) {
        console.error("비디오 목록 조회 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [filter]);

  const handleMoreClick = (video: Video) => {
    console.log("More clicked:", video);
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("type", filter);
    const url = params.toString()
      ? `/api/library/videos?${params.toString()}`
      : "/api/library/videos";
    apiClient
      .get(url, VideoListApiResponseSchema)
      .then((res) => setVideos(res.data.videos))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="space-y-6">
      {/* 헤더, 업로드 버튼, 필터 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Video Library</h1>
        <div className="flex items-center gap-3">
          <VideoFilter value={filter} onChange={setFilter} />
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
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

      <UploadVideoModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        studioId={studioId ?? ""}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
