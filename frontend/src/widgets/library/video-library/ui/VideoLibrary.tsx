"use client";

import { useState } from "react";
import { VideoCard } from "@/widgets/library/video-card";
import { VideoFilter, type FilterType } from "@/widgets/library/video-filter";
import { useVideoLibrary } from "@/features/library/video-library";
import { UploadVideoModal } from "@/widgets/library/upload-video-modal";
import { Button } from "@/shared/ui/button";
import { Upload } from "lucide-react";

interface VideoLibraryProps {
  /** 업로드 시에만 사용(선택). 없으면 전체 영상 목록만 표시 */
  studioId?: string;
}

export function VideoLibrary({ studioId }: VideoLibraryProps = {}) {
  const {
    videos,
    filter,
    setFilter,
    isLoading,
    handleMoreClick,
    refetch,
  } = useVideoLibrary();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    refetch();
  };

  return (
    <div className="space-y-6">
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
