"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { StudioHeader } from "@/widgets/studio/studio-header";
import { PreviewArea } from "@/widgets/studio/preview-area";
import { LayoutControls } from "@/widgets/studio/layout-controls";
import { ScenesPanel } from "@/widgets/studio/scenes-panel";
import { SourcesPanel } from "@/widgets/studio/sources-panel";
import { ControlBar } from "@/widgets/studio/control-bar";
import { StudioSidebar } from "@/widgets/studio/studio-sidebar";
import { z } from "zod";
import { apiClient } from "@/shared/api/client";
import {
  StudioDetailSchema,
  type StudioDetail,
  type LayoutType,
  type Scene,
  type Source,
} from "@/entities/studio/model";

interface StudioMainProps {
  studioId: string;
}

export function StudioMain({ studioId }: StudioMainProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [studio, setStudio] = useState<StudioDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>("full");
  const [activeSceneId, setActiveSceneId] = useState<string>("");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isLive, setIsLive] = useState(false);
  
  // 디폴트 웹캠 소스 (sources가 비어있을 때 사용)
  const defaultVideoSource: Source = useMemo(
    () => ({
      id: "default-webcam",
      type: "video" as const,
      name: "웹캠",
      isVisible: true,
    }),
    [],
  );
  
  // 실제 사용할 sources (백엔드 sources가 있으면 사용, 없으면 디폴트 웹캠)
  const displaySources = useMemo(() => {
    return studio?.sources && studio.sources.length > 0
      ? studio.sources
      : [defaultVideoSource];
  }, [studio?.sources, defaultVideoSource]);

  useEffect(() => {
    fetchStudio();
  }, [studioId]);

  const fetchStudio = async () => {
    try {
      setIsLoading(true);
      // 백엔드 ApiResponse 래핑 형식: { success, message?, data: StudioDetail }
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

  const handleGoLive = () => {
    setIsLive(true);
    // 실제로는 백엔드에 라이브 시작 요청
    console.log("Go Live!");
  };

  const handleSceneSelect = (sceneId: string) => {
    setActiveSceneId(sceneId);
    // 실제로는 백엔드에 씬 변경 요청
  };

  const handleAddScene = () => {
    // 씬 추가 로직
    console.log("Add Scene");
  };

  const handleRemoveScene = (sceneId: string) => {
    // 씬 삭제 로직
    console.log("Remove Scene:", sceneId);
  };

  const handleAddSource = () => {
    // 소스 추가 로직
    console.log("Add Source");
  };

  const handleSourceToggle = (sourceId: string) => {
    // 소스 표시/숨김 토글
    console.log("Toggle Source:", sourceId);
  };

  const handleExit = () => {
    if (confirm("스튜디오를 나가시겠습니까?")) {
      // 워크스페이스 홈으로 이동
      if (user?.userId) {
        router.push(`/workspace/${user.userId}`);
      } else {
        router.back();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-gray-400">스튜디오를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 헤더 */}
        <StudioHeader
          studioTitle={studio.name}
          onGoLive={handleGoLive}
          isLive={isLive}
        />

        {/* 메인 컨텐츠 */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* 프리뷰 영역 */}
          <div className="flex-1 min-h-0">
            <PreviewArea
              className="h-full"
              layout={currentLayout}
              sources={displaySources}
              isVideoEnabled={isVideoEnabled}
              isAudioEnabled={isAudioEnabled}
            />
          </div>

          {/* 레이아웃 컨트롤 */}
          <div className="shrink-0">
            <LayoutControls
              currentLayout={currentLayout}
              onLayoutChange={setCurrentLayout}
              savedLayoutsCount={3}
            />
          </div>

          {/* 하단 패널 */}
          <div className="grid grid-cols-2 gap-4 shrink-0 min-h-0">
            {/* Scenes 패널 */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-auto">
              <ScenesPanel
                scenes={studio.scenes ?? []}
                activeSceneId={activeSceneId}
                onSceneSelect={handleSceneSelect}
                onAddScene={handleAddScene}
                onRemoveScene={handleRemoveScene}
              />
            </div>

            {/* Sources 패널 */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-auto">
              <SourcesPanel
                sources={displaySources}
                onAddSource={handleAddSource}
                onSourceToggle={handleSourceToggle}
              />
            </div>
          </div>

          {/* 컨트롤 바 */}
          <div className="shrink-0">
            <ControlBar
              isVideoEnabled={isVideoEnabled}
              isAudioEnabled={isAudioEnabled}
              onVideoToggle={() => setIsVideoEnabled(!isVideoEnabled)}
              onAudioToggle={() => setIsAudioEnabled(!isAudioEnabled)}
              onSettings={() => console.log("Settings")}
              onExit={handleExit}
            />
          </div>
        </div>
      </div>

      {/* 오른쪽 사이드바 */}
      <StudioSidebar />
    </div>
  );
}
