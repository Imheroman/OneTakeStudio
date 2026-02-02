"use client";

import { useState, useEffect, useCallback } from "react";
import { getRecordings } from "@/shared/api/library";
import type { Video, VideoType } from "@/entities/video/model";

export type FilterType = "all" | VideoType;

export function useVideoLibrary() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    try {
      setIsLoading(true);
      const { videos: list } = await getRecordings({ page: 0, size: 50 });
      setVideos(list);
    } catch (error) {
      console.error("비디오 목록 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleMoreClick = (video: Video) => {
    console.log("More clicked:", video);
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
