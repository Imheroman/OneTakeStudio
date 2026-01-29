"use client";

import { useRef } from "react";
import { StudioHeader } from "@/widgets/studio/studio-header";
import { PreviewArea } from "@/widgets/studio/preview-area";
import { StagingArea } from "@/widgets/studio/staging-area";
import { LayoutControls } from "@/widgets/studio/layout-controls";
import { ScenesPanel } from "@/widgets/studio/scenes-panel";
import { ControlBar } from "@/widgets/studio/control-bar";
import { StudioSidebar } from "@/widgets/studio/studio-sidebar";
import { AddSourceDialog } from "@/widgets/studio/add-source-dialog";
import { useStudioMain } from "@/features/studio/studio-main";
import { useAudioLevel, useSourceStreams } from "@/hooks/studio";
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
    sources,
    displaySources,
    onStageSourceIds,
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
    handleAddToStage,
    handleRemoveFromStage,
    handleReorderSources,
    handleBringSourceToFront,
    handleExit,
    showAddSourceDialog,
    setShowAddSourceDialog,
    previewResolution,
    setPreviewResolution,
    sourceTransforms,
    setSourceTransform,
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
  const { getStream: getSourceStream, streamIds: availableStreamIds } =
    useSourceStreams(sources, { isVideoEnabled, isAudioEnabled });

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
              availableStreamIds={availableStreamIds}
              isVideoEnabled={isVideoEnabled}
              isAudioEnabled={isAudioEnabled}
              isEditMode={isEditMode}
              resolution={previewResolution}
              getSourceStream={getSourceStream}
              getPreviewStreamRef={getPreviewStreamRef}
              sourceTransforms={sourceTransforms}
              setSourceTransform={setSourceTransform}
              onBringSourceToFront={handleBringSourceToFront}
            />
          </div>

          <div className="shrink-0">
            <StagingArea
              sources={sources}
              onStageSourceIds={onStageSourceIds}
              canAddSource={canAddSource}
              isEditMode={isEditMode}
              getSourceStream={getSourceStream}
              onReorder={handleReorderSources}
              onAddSource={handleAddSource}
              onSourceToggle={handleSourceToggle}
              onAddToStage={handleAddToStage}
              onRemoveFromStage={handleRemoveFromStage}
            />
          </div>

          <div className="shrink-0">
            <LayoutControls
              currentLayout={currentLayout}
              onLayoutChange={setCurrentLayout}
              savedLayoutsCount={3}
            />
          </div>

          <div className="shrink-0 min-h-0">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 overflow-auto">
              <ScenesPanel
                scenes={scenesForPanel}
                activeSceneId={activeSceneId}
                onSceneSelect={handleSceneSelect}
                onAddScene={handleAddScene}
                onRemoveScene={handleRemoveScene}
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
              resolution={previewResolution}
              onResolutionChange={setPreviewResolution}
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
