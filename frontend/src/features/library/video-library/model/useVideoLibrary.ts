"use client";

import { useState, useEffect, useCallback } from "react";
import { getRecordings, deleteRecording } from "@/shared/api/library";
import type { Video, VideoType } from "@/entities/video/model";

export type FilterType = "all" | VideoType;

export function useVideoLibrary() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchVideos = useCallback(async (): Promise<Video[]> => {
    try {
      setIsLoading(true);
      const { videos: list } = await getRecordings({ page: 0, size: 50 });
      setVideos(list);
      return list;
    } catch (error) {
      console.error("비디오 목록 조회 실패:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleMoreClick = async (video: Video) => {
    if (!confirm(`"${video.title}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await deleteRecording(video.id);
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
    } catch (error) {
      console.error("영상 삭제 실패:", error);
      alert("영상 삭제에 실패했습니다.");
    }
  };

  return {
    videos,
    filter,
    setFilter,
    isLoading,
    handleMoreClick,
    refetch: fetchVideos,
  };
}
