"use client";

import { useRef, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
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
import type { BannerItem } from "@/widgets/studio/studio-sidebar/panels/StudioBannerPanel";
import type { AssetItem } from "@/widgets/studio/studio-sidebar/panels/StudioAssetPanel";
import type { StudioStyleState } from "@/widgets/studio/studio-sidebar/panels/StudioStylePanel";

const DEFAULT_STYLE: StudioStyleState = {
  brandColor: "#5d4cc7",
  theme: "bubble",
  showDisplayNames: true,
  showHeadlines: false,
  font: "",
};

interface StudioMainProps {
  studioId: string;
}

export function StudioMain({ studioId }: StudioMainProps) {
  const getPreviewStreamRef = useRef<(() => MediaStream | null) | null>(null);
  const [toolbarExpanded, setToolbarExpanded] = useState(true);
  const [activeBanner, setActiveBanner] = useState<BannerItem | null>(null);
  const [activeAsset, setActiveAsset] = useState<AssetItem | null>(null);
  const [styleState, setStyleState] = useState<StudioStyleState>(DEFAULT_STYLE);

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
    handleSaveSceneLayout,
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
      {/* 왼쪽 사이드바: 씬 */}
      <aside className="shrink-0 w-56 border-r border-gray-700 bg-gray-800/95 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300">Scenes</h3>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <ScenesPanel
            scenes={scenesForPanel}
            activeSceneId={activeSceneId}
            onSceneSelect={handleSceneSelect}
            onAddScene={handleAddScene}
            onRemoveScene={handleRemoveScene}
            onSaveScene={handleSaveSceneLayout}
            isEditMode={isEditMode}
          />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <StudioHeader
          studioTitle={studio.name}
          onGoLive={handleGoLive}
          isLive={isLive}
          isEditMode={isEditMode}
          onEditModeToggle={() => setIsEditMode((v) => !v)}
        />

        {/* 콘텐츠: 전체 높이 사용, 하단 툴바에 밀리지 않음 */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden min-h-0">
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
              activeBanner={activeBanner}
              activeAsset={activeAsset}
              styleState={styleState}
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
        </div>

        {/* 하단 툴바: 콘텐츠 위에 겹침(오버레이) */}
        <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-gray-700 bg-gray-800/95 shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-center py-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setToolbarExpanded((v) => !v)}
              className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
              title={toolbarExpanded ? "툴바 접기 (↓)" : "툴바 펼치기 (↑)"}
              aria-label={toolbarExpanded ? "툴바 접기" : "툴바 펼치기"}
            >
              {toolbarExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </Button>
          </div>
          {toolbarExpanded && (
            <div className="px-4 pb-2">
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
          )}
        </div>

        <AddSourceDialog
          open={showAddSourceDialog}
          onOpenChange={setShowAddSourceDialog}
          onSelect={handleAddSourceConfirm}
        />
      </div>

      <StudioSidebar
        studioId={studioId}
        activeBanner={activeBanner}
        onSelectBanner={setActiveBanner}
        activeAsset={activeAsset}
        onSelectAsset={setActiveAsset}
        styleState={styleState}
        onStyleChange={setStyleState}
      />
    </div>
  );
}
