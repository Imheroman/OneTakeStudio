"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { z } from "zod";
import { apiClient } from "@/shared/api/client";
import {
  StudioDetailSchema,
  type StudioDetail,
  type LayoutType,
  type Source,
} from "@/entities/studio/model";

export function useStudioMain(studioId: string) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [studio, setStudio] = useState<StudioDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>("full");
  const [activeSceneId, setActiveSceneId] = useState<string>("");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const defaultVideoSource: Source = useMemo(
    () => ({
      id: "default-webcam",
      type: "video" as const,
      name: "웹캠",
      isVisible: true,
    }),
    [],
  );

  const displaySources = useMemo(() => {
    const sources = (studio as { sources?: Source[] })?.sources;
    return sources && sources.length > 0 ? sources : [defaultVideoSource];
  }, [studio, defaultVideoSource]);

  const fetchStudio = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(
        `/api/studios/${studioId}`,
        z.object({
          success: z.boolean(),
          message: z.string().optional(),
          data: StudioDetailSchema,
        }),
      );
      setStudio(response.data);
    } catch (error) {
      console.error("스튜디오 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudio();
  }, [studioId]);

  const handleGoLive = () => {
    setIsLive(true);
    console.log("Go Live!");
  };

  const handleSceneSelect = (sceneId: string) => {
    setActiveSceneId(sceneId);
  };

  const handleAddScene = () => {
    console.log("Add Scene");
  };

  const handleRemoveScene = (sceneId: string) => {
    console.log("Remove Scene:", sceneId);
  };

  const handleAddSource = () => {
    console.log("Add Source");
  };

  const handleSourceToggle = (sourceId: string) => {
    console.log("Toggle Source:", sourceId);
  };

  const handleExit = () => {
    if (confirm("스튜디오를 나가시겠습니까?")) {
      if (user?.userId) {
        router.push(`/workspace/${user.userId}`);
      } else {
        router.back();
      }
    }
  };

  const setCurrentLayoutState = setCurrentLayout;
  const setIsVideoEnabledState = setIsVideoEnabled;
  const setIsAudioEnabledState = setIsAudioEnabled;

  return {
    studio,
    isLoading,
    currentLayout,
    setCurrentLayout: setCurrentLayoutState,
    activeSceneId,
    displaySources,
    isVideoEnabled,
    isAudioEnabled,
    isLive,
    handleGoLive,
    handleSceneSelect,
    handleAddScene,
    handleRemoveScene,
    handleAddSource,
    handleSourceToggle,
    handleExit,
    setIsVideoEnabled: setIsVideoEnabledState,
    setIsAudioEnabled: setIsAudioEnabledState,
  };
}
