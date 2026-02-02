"use client";

import { useState, useRef, useEffect } from "react";
import { List } from "react-window";
import { VideoCard } from "@/widgets/library/video-card";
import { VideoFilter } from "@/widgets/library/video-filter";
import { useVideoLibrary } from "@/features/library/video-library";
import { UploadVideoModal } from "@/widgets/library/upload-video-modal";
import { Button } from "@/shared/ui/button";
import { Upload } from "lucide-react";
import type { Video } from "@/entities/video/model";

const CARD_ROW_HEIGHT = 260;
const VIRTUAL_THRESHOLD = 24;

function getColumnCount(width: number): number {
  if (width < 640) return 1;
  if (width < 1024) return 2;
  if (width < 1280) return 3;
  return 4;
}

function VideoLibraryRow({
  index,
  style,
  videos: allVideos,
  columnCount,
  onMoreClick,
}: {
  index: number;
  style: React.CSSProperties;
  videos: Video[];
  columnCount: number;
  onMoreClick?: (video: Video) => void;
}) {
  const start = index * columnCount;
  const rowVideos = allVideos.slice(start, start + columnCount);
  return (
    <div
      style={{
        ...style,
        display: "grid",
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        gap: 24,
        paddingBottom: 24,
      }}
    >
      {rowVideos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onMoreClick={onMoreClick}
        />
      ))}
    </div>
  );
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(4);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0]?.contentRect ?? { width: 0 };
      setColumnCount(getColumnCount(width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    refetch();
  };

  const useVirtualList = !isLoading && videos.length > VIRTUAL_THRESHOLD;
  const rowCount = useVirtualList
    ? Math.ceil(videos.length / columnCount)
    : 0;
  const listHeight =
    rowCount <= 0
      ? 400
      : Math.min(
          CARD_ROW_HEIGHT * rowCount,
          typeof window !== "undefined" ? window.innerHeight - 280 : 520
        );

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">내 보관함</h1>
        <div className="flex items-center gap-3">
          <VideoFilter value={filter} onChange={setFilter} />
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            파일 업로드
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
      ) : useVirtualList ? (
        <List<
          { videos: Video[]; columnCount: number; onMoreClick?: (video: Video) => void }
        >
          rowCount={rowCount}
          rowHeight={CARD_ROW_HEIGHT}
          rowComponent={VideoLibraryRow}
          rowProps={{
            videos,
            columnCount,
            onMoreClick: handleMoreClick,
          }}
          style={{ height: listHeight, width: "100%" }}
          overscanCount={2}
        />
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
