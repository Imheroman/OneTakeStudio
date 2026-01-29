"use client";

import { VideoCard } from "@/widgets/library/video-card";
import { VideoFilter, type FilterType } from "@/widgets/library/video-filter";
import { useVideoLibrary } from "@/features/library/video-library";

export function VideoLibrary() {
  const {
    videos,
    filter,
    setFilter,
    isLoading,
    handleMoreClick,
  } = useVideoLibrary();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Video Library</h1>
        <VideoFilter value={filter} onChange={setFilter} />
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
    </div>
  );
}
