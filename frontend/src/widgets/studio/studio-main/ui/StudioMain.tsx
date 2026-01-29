"use client";

import { useRef } from "react";
import { StudioHeader } from "@/widgets/studio/studio-header";
import { PreviewArea } from "@/widgets/studio/preview-area";
import { LayoutControls } from "@/widgets/studio/layout-controls";
import { ScenesPanel } from "@/widgets/studio/scenes-panel";
import { SourcesPanel } from "@/widgets/studio/sources-panel";
import { ControlBar } from "@/widgets/studio/control-bar";
import { StudioSidebar } from "@/widgets/studio/studio-sidebar";
import { AddSourceDialog } from "@/widgets/studio/add-source-dialog";
import { useStudioMain } from "@/features/studio/studio-main";
import { useAudioLevel } from "@/hooks/studio";
import type { GetPreviewStreamRef } from "@/features/studio/studio-main";

interface StudioMainProps {
  studioId: string;
}

export function StudioMain({ studioId }: StudioMainProps) {
  const getPreviewStreamRef = useRef<(() => MediaStream | null) | null>(null);

  const {
    studio,
    isLoading,
    currentLayout,
    setCurrentLayout,
    activeSceneId,
    scenesForPanel,
    displaySources,
    canAddSource,
    isEditMode,
    setIsEditMode,
    isVideoEnabled,
    isAudioEnabled,
    isLive,
    handleGoLive,
    handleSceneSelect,
    handleAddScene,
    handleRemoveScene,
    handleAddSource,
    handleAddSourceConfirm,
    handleSourceToggle,
    handleExit,
    showAddSourceDialog,
    setShowAddSourceDialog,
    setIsVideoEnabled,
    setIsAudioEnabled,
    isRecordingLocal,
    isRecordingCloud,
    handleStartLocalRecording,
    handleStopLocalRecording,
    handleStartCloudRecording,
    handleStopCloudRecording,
  } = useStudioMain(studioId, { getPreviewStreamRef });

  const audioLevel = useAudioLevel(isAudioEnabled);

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
          isEditMode={isEditMode}
          onEditModeToggle={() => setIsEditMode((v) => !v)}
        />

        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          <div className="flex-1 min-h-0">
            <PreviewArea
              className="h-full"
              layout={currentLayout}
              sources={displaySources}
              isVideoEnabled={isVideoEnabled}
              isAudioEnabled={isAudioEnabled}
              isEditMode={isEditMode}
              getPreviewStreamRef={getPreviewStreamRef}
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
                scenes={scenesForPanel}
                activeSceneId={activeSceneId}
                onSceneSelect={handleSceneSelect}
                onAddScene={handleAddScene}
                onRemoveScene={handleRemoveScene}
              />
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-auto">
              <SourcesPanel
                sources={displaySources}
                canAddSource={canAddSource}
                onAddSource={handleAddSource}
                onSourceToggle={handleSourceToggle}
              />
            </div>

            <AddSourceDialog
              open={showAddSourceDialog}
              onOpenChange={setShowAddSourceDialog}
              onSelect={handleAddSourceConfirm}
            />
          </div>

          <div className="shrink-0">
            <ControlBar
              isVideoEnabled={isVideoEnabled}
              isAudioEnabled={isAudioEnabled}
              audioLevel={audioLevel}
              onVideoToggle={() => setIsVideoEnabled(!isVideoEnabled)}
              onAudioToggle={() => setIsAudioEnabled(!isAudioEnabled)}
              onSettings={() => console.log("Settings")}
              onExit={handleExit}
              isRecordingLocal={isRecordingLocal}
              isRecordingCloud={isRecordingCloud}
              onStartLocalRecording={handleStartLocalRecording}
              onStopLocalRecording={handleStopLocalRecording}
              onStartCloudRecording={handleStartCloudRecording}
              onStopCloudRecording={handleStopCloudRecording}
            />
          </div>
        </div>
      </div>

      <StudioSidebar />
    </div>
  );
}
