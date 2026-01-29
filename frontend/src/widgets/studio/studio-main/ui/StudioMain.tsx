"use client";

import { StudioHeader } from "@/widgets/studio/studio-header";
import { PreviewArea } from "@/widgets/studio/preview-area";
import { LayoutControls } from "@/widgets/studio/layout-controls";
import { ScenesPanel } from "@/widgets/studio/scenes-panel";
import { SourcesPanel } from "@/widgets/studio/sources-panel";
import { ControlBar } from "@/widgets/studio/control-bar";
import { StudioSidebar } from "@/widgets/studio/studio-sidebar";
import { useStudioMain } from "@/features/studio/studio-main";

interface StudioMainProps {
  studioId: string;
}

export function StudioMain({ studioId }: StudioMainProps) {
  const {
    studio,
    isLoading,
    currentLayout,
    setCurrentLayout,
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
    setIsVideoEnabled,
    setIsAudioEnabled,
  } = useStudioMain(studioId);

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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StudioHeader
          studioTitle={studio.name}
          onGoLive={handleGoLive}
          isLive={isLive}
        />

        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          <div className="flex-1 min-h-0">
            <PreviewArea
              className="h-full"
              layout={currentLayout}
              sources={displaySources}
              isVideoEnabled={isVideoEnabled}
              isAudioEnabled={isAudioEnabled}
            />
          </div>

          <div className="shrink-0">
            <LayoutControls
              currentLayout={currentLayout}
              onLayoutChange={setCurrentLayout}
              savedLayoutsCount={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 shrink-0 min-h-0">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-auto">
              <ScenesPanel
                scenes={studio.scenes ?? []}
                activeSceneId={activeSceneId}
                onSceneSelect={handleSceneSelect}
                onAddScene={handleAddScene}
                onRemoveScene={handleRemoveScene}
              />
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-auto">
              <SourcesPanel
                sources={displaySources}
                onAddSource={handleAddSource}
                onSourceToggle={handleSourceToggle}
              />
            </div>
          </div>

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

      <StudioSidebar />
    </div>
  );
}
