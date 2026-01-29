"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/shared/api/client";
import {
  VideoListResponseSchema,
  type Video,
  type VideoType,
} from "@/entities/video/model";

export type FilterType = "all" | VideoType;

export function useVideoLibrary() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const url =
          filter !== "all"
            ? `/api/library/videos?type=${filter}`
            : "/api/library/videos";
        const response = await apiClient.get(url, VideoListResponseSchema);
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
    console.log("More clicked:", video);
  };

  return {
    videos,
    filter,
    setFilter,
    isLoading,
    handleMoreClick,
  };
}
