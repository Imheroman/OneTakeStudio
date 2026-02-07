"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion, LayoutGroup } from "motion/react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { sidebarSpring } from "@/shared/lib/sidebar-motion";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  useAudioLevel,
  useSourceStreams,
  useVolumeMeter,
} from "@/hooks/studio";
import { apiClient } from "@/shared/api/client";
import { ApiResponseDestinationListSchema } from "@/entities/channel/model";
import type { GetPreviewStreamRef } from "@/features/studio/studio-main";
import type { BannerItem } from "@/widgets/studio/studio-sidebar/panels/StudioBannerPanel";
import type { AssetItem } from "@/widgets/studio/studio-sidebar/panels/StudioAssetPanel";
import type { StudioStyleState } from "@/widgets/studio/studio-sidebar/panels/StudioStylePanel";
import type { ConnectedDestinationItem } from "@/widgets/studio/studio-sidebar/ui/StudioSidebar";
import { z } from "zod";
import { getChatHistory } from "@/shared/api/studio-chat";
import type { ChatMessage } from "@/entities/chat/model";

const ApiResponseMarkerSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional().nullable(),
});

const DEFAULT_STYLE: StudioStyleState = {
  brandColor: "#5d4cc7",
  theme: "circle",
};

interface StudioMainProps {
  studioId: string;
}

export function StudioMain({ studioId }: StudioMainProps) {
  const getPreviewStreamRef = useRef<(() => MediaStream | null) | null>(null);
  const requestCaptureDrawRef = useRef<(() => Promise<void>) | null>(null);
  const [toolbarExpanded, setToolbarExpanded] = useState(true);
  const [activeBanner, setActiveBanner] = useState<BannerItem | null>(null);
  const [bannerRemainingSeconds, setBannerRemainingSeconds] = useState<
    number | null
  >(null);
  const [activeAsset, setActiveAsset] = useState<AssetItem | null>(null);
  const [styleState, setStyleState] = useState<StudioStyleState>(DEFAULT_STYLE);
  const [destinations, setDestinations] = useState<ConnectedDestinationItem[]>(
    []
  );
  const [showUnsavedConfirmModal, setShowUnsavedConfirmModal] = useState(false);
  const [showLockedByOtherModal, setShowLockedByOtherModal] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const liveStartedAtRef = useRef<number | null>(null);
  const [chatOverlayVisible, setChatOverlayVisible] = useState(false);
  const [chatOverlayMessages, setChatOverlayMessages] = useState<ChatMessage[]>([]);

  // 채팅 오버레이용 폴링: chatOverlayVisible이 true일 때만 5초 간격으로 채팅 조회
  useEffect(() => {
    if (!chatOverlayVisible || !studioId) return;
    let cancelled = false;
    const fetchOverlayChat = async () => {
      try {
        const list = await getChatHistory(studioId);
        if (cancelled) return;
        // INTERNAL 제외, 공개 메시지만
        const publicMessages = list.filter((m) => m.platform !== "INTERNAL");
        // 최신순 → 오래된순으로 뒤집기
        publicMessages.reverse();
        setChatOverlayMessages(publicMessages);
      } catch {
        // 조용히 실패
      }
    };
    fetchOverlayChat();
    const interval = setInterval(fetchOverlayChat, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [chatOverlayVisible, studioId]);

  // 배너 타이머: timerSeconds가 있으면 카운트다운, 0이 되면 자동 중단
  useEffect(() => {
    if (!activeBanner) {
      setBannerRemainingSeconds(null);
      return;
    }
    const total = activeBanner.timerSeconds;
    if (total == null || total <= 0) {
      setBannerRemainingSeconds(null);
      return;
    }
    setBannerRemainingSeconds(total);
    let remaining = total;
    const id = setInterval(() => {
      remaining -= 1;
      setBannerRemainingSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        setActiveBanner(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [activeBanner?.id, activeBanner?.timerSeconds]);

  // 연동된 채널 목록 가져오기
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await apiClient.get(
          "/api/destinations",
          ApiResponseDestinationListSchema
        );
        const items: ConnectedDestinationItem[] = (response.data ?? []).map(
          (d) => ({
            id: d.id,
            platform: d.platform,
            channelName: d.channelName ?? d.channelId ?? null,
          })
        );
        setDestinations(items);
      } catch (error) {
        console.error("채널 목록 조회 실패:", error);
      }
    };
    fetchDestinations();
  }, []);

  const {
    studio,
    isLoading,
    currentLayout,
    setCurrentLayout,
    previewSceneId,
    broadcastSceneId,
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
    handleEndLive,
    isHost,
    handleSceneSelectForPreview,
    handleSceneBroadcast,
    handleRecommendScene,
    handleRecommendationConfirm,
    handleRecommendationCancel,
    recommendedScene,
    handleAddScene,
    handleRemoveScene,
    handleUpdateScene,
    handleAddSource,
    handleAddSourceConfirm,
    handleSourceToggle,
    handleAddToStage,
    handleRemoveFromStage,
    handleReorderSources,
    handleRemoveSource,
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
    isAutoRecording,
    handleStartLocalRecording,
    handleStopLocalRecording,
    handleStartCloudRecording,
    handleStopCloudRecording,
    // 송출 관련
    isStreamConnected,
    isPublishing,
    isGoingLive,
    selectedDestinationIds,
    setSelectedDestinationIds,
    publishError,
    // 편집 락 관련
    hasUnsavedChanges,
    isLockLoading,
    hasLock,
    isLockedByOther,
    lockedByNickname,
    acquireLock,
    releaseLock,
    forceReleaseLock,
    // 상태 동기화 관련
    isStateSyncConnected,
    onlineMembers,
    // 실시간 미디어 공유 관련
    isLiveKitConnected,
    remoteSources,
    publishedTracks,
    localPublishedStreamsRef,
  } = useStudioMain(studioId, {
    getPreviewStreamRef,
    requestCaptureDrawRef,
  });

  // 라이브 시작/종료 시 타임스탬프 기록 (북마크 경과 시간 계산용)
  useEffect(() => {
    if (isLive) {
      liveStartedAtRef.current = Date.now();
    } else {
      liveStartedAtRef.current = null;
    }
  }, [isLive]);

  // 북마크 클릭 핸들러: API로 마커 생성
  const handleBookmarkClick = useCallback(async () => {
    const startedAt = liveStartedAtRef.current;
    if (!startedAt) {
      // 라이브 중이 아니면 로컬 카운터만 증가
      setBookmarkCount((c) => c + 1);
      return;
    }
    const timestampSec = (Date.now() - startedAt) / 1000;
    try {
      await apiClient.post("/api/media/markers", ApiResponseMarkerSchema, {
        studioId,
        timestampSec,
        label: "북마크",
      });
      setBookmarkCount((c) => c + 1);
    } catch (error) {
      console.error("북마크 생성 실패:", error);
      // API 실패해도 UI 카운터는 증가시켜 피드백 제공
      setBookmarkCount((c) => c + 1);
    }
  }, [studioId]);

  // 편집 모드 진입 시 락 획득 시도
  const handleEditModeToggle = async () => {
    if (!isEditMode) {
      // 편집 모드로 진입하려면 락 획득 필요
      if (!hasLock && !isLockedByOther) {
        const acquired = await acquireLock();
        if (acquired) {
          setIsEditMode(true);
        }
      } else if (hasLock) {
        // 이미 락을 가지고 있으면 편집 모드 진입
        setIsEditMode(true);
      }
      // 다른 사람이 락을 가지고 있으면 진입 불가
    } else {
      // 편집 모드 종료 (락은 유지, 명시적으로 해제해야 함)
      setIsEditMode(false);
    }
  };

  // 락 획득 핸들러
  const handleAcquireLock = async () => {
    const acquired = await acquireLock();
    if (acquired) {
      setIsEditMode(true);
    }
  };

  // 락 해제 핸들러 (미저장 변경 시 확인 모달 표시)
  const handleReleaseLock = async () => {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirmModal(true);
      return;
    }
    await releaseLock();
    setIsEditMode(false);
  };

  // 미저장 확인 모달: 저장 후 해제
  const handleUnsavedModalSave = async () => {
    await handleSaveSceneLayout();
    setShowUnsavedConfirmModal(false);
    await releaseLock();
    setIsEditMode(false);
  };

  // 미저장 확인 모달: 저장 안 함(삭제) 후 해제
  const handleUnsavedModalDiscard = async () => {
    setShowUnsavedConfirmModal(false);
    await releaseLock();
    setIsEditMode(false);
  };

  // 미저장 확인 모달: 편집으로 돌아가기
  const handleUnsavedModalCancel = () => {
    setShowUnsavedConfirmModal(false);
  };

  // 강제 해제 핸들러 (호스트 전용)
  const handleForceReleaseLock = async () => {
    if (confirm("다른 사용자의 편집 권한을 강제로 해제하시겠습니까?")) {
      await forceReleaseLock();
    }
  };

  // 실제 편집 가능 여부
  // - 호스트 + 송출 중 + 송출 장면 편집: 락 없어도 가능
  // - 매니저 + 송출 중 + 송출 장면: 편집 불가
  // - 그 외: 락 + 편집 모드 필요
  const isManager = (studio?.myRole?.toUpperCase?.() ?? "") === "MANAGER";
  const isEditingBroadcastScene = isLive && previewSceneId === broadcastSceneId;
  const canEdit =
    (isHost && isEditingBroadcastScene) ||
    (isEditMode &&
      hasLock &&
      !isLockedByOther &&
      !(isManager && isEditingBroadcastScene));

  const audioLevel = useAudioLevel(isAudioEnabled);
  const {
    getStream: getSourceStream,
    streamIds: availableStreamIds,
    streamIdsKey,
    streamsMap,
  } = useSourceStreams(sources, {
    isVideoEnabled,
    isAudioEnabled,
    remoteSources,
    publishedTracks,
    localPublishedStreamsRef,
  });

  const streamsWithAudio = useMemo(
    () =>
      Array.from(streamsMap.values()).filter(
        (s) => s.getAudioTracks().length > 0
      ),
    [streamsMap]
  );
  const levelHistory = useVolumeMeter(
    isAudioEnabled,
    audioLevel,
    streamsWithAudio
  );

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
    <LayoutGroup>
      <div className="flex h-screen bg-gray-900 overflow-hidden">
        {/* 왼쪽 사이드바: 씬 */}
        <aside className="shrink-0 w-56 border-r border-gray-700 bg-gray-800/95 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300">Scenes</h3>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <ScenesPanel
              scenes={scenesForPanel}
              previewSceneId={previewSceneId}
              broadcastSceneId={broadcastSceneId}
              onSceneSelectForPreview={handleSceneSelectForPreview}
              onSceneBroadcast={handleSceneBroadcast}
              onAddScene={handleAddScene}
              onRemoveScene={handleRemoveScene}
              onRenameScene={(sceneId, name) =>
                handleUpdateScene(sceneId, { name })
              }
              onSaveScene={handleSaveSceneLayout}
              isEditMode={canEdit}
              isHost={isHost}
              canRenameScene={
                isHost || (studio?.myRole?.toUpperCase?.() ?? "") === "MANAGER"
              }
              canEditScene={
                isManager && isLive
                  ? (sceneId) => sceneId !== broadcastSceneId
                  : undefined
              }
              isLive={isLive}
              onSceneRecommend={handleRecommendScene}
            />
          </div>
        </aside>

        <motion.div
          layout
          className="flex-1 flex flex-col min-w-0 overflow-hidden relative"
          transition={{ layout: sidebarSpring }}
        >
          <StudioHeader
            studioTitle={studio.name}
            studioId={studioId}
            onGoLive={handleGoLive}
            onEndLive={handleEndLive}
            isLive={isLive}
            isGoingLive={isGoingLive}
            isPublishing={isPublishing}
            isStreamConnected={isStreamConnected}
            isAutoRecording={isAutoRecording}
            isRecordingCloud={isRecordingCloud}
            selectedDestinationIds={selectedDestinationIds}
            setSelectedDestinationIds={setSelectedDestinationIds}
            publishError={publishError}
            isEditMode={isEditMode}
            onEditModeToggle={handleEditModeToggle}
            // 편집 락 관련
            isLockLoading={isLockLoading}
            hasLock={hasLock}
            isLockedByOther={isLockedByOther}
            lockedByNickname={lockedByNickname}
            onAcquireLock={handleAcquireLock}
            onReleaseLock={handleReleaseLock}
            onLockedClick={() => setShowLockedByOtherModal(true)}
            onForceReleaseLock={handleForceReleaseLock}
            isStateSyncConnected={isStateSyncConnected}
            bookmarkCount={bookmarkCount}
            onBookmarkClick={handleBookmarkClick}
          />

          {/* 콘텐츠: 전체 높이 사용. 하단 pb로 접힌 토글 네브에 퀵 레이아웃 바가 가리지 않도록 여백 */}
          <div className="flex-1 flex flex-col p-4 pb-14 gap-4 overflow-hidden min-h-0 min-w-0">
            <div className="flex-1 min-h-0 min-w-0">
              <PreviewArea
                className="h-full"
                layout={currentLayout}
                sources={displaySources}
                availableStreamIds={availableStreamIds}
                streamIdsKey={streamIdsKey}
                isStreaming={isPublishing}
                isVideoEnabled={isVideoEnabled}
                isAudioEnabled={isAudioEnabled}
                isEditMode={canEdit}
                resolution={previewResolution}
                getSourceStream={getSourceStream}
                getPreviewStreamRef={getPreviewStreamRef}
                requestCaptureDrawRef={requestCaptureDrawRef}
                sourceTransforms={sourceTransforms}
                setSourceTransform={setSourceTransform}
                onBringSourceToFront={handleBringSourceToFront}
                activeBanner={activeBanner}
                activeAsset={activeAsset}
                styleState={styleState}
                chatOverlayConfig={chatOverlayVisible ? { visible: true, messageCount: 5 } : null}
                chatMessages={chatOverlayMessages}
              />
            </div>

            <div className="shrink-0">
              <StagingArea
                sources={sources}
                onStageSourceIds={onStageSourceIds}
                canAddSource={canAddSource && canEdit}
                isEditMode={canEdit}
                getSourceStream={getSourceStream}
                onReorder={handleReorderSources}
                onAddSource={handleAddSource}
                onSourceToggle={handleSourceToggle}
                onAddToStage={handleAddToStage}
                onRemoveFromStage={handleRemoveFromStage}
                onRemoveSource={handleRemoveSource}
              />
            </div>

            <div className="shrink-0">
              <LayoutControls
                currentLayout={currentLayout}
                onLayoutChange={setCurrentLayout}
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
                  levelHistory={levelHistory}
                  onVideoToggle={() => setIsVideoEnabled(!isVideoEnabled)}
                  onAudioToggle={() => setIsAudioEnabled(!isAudioEnabled)}
                  onSettings={() => {}}
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

          {/* 다른 사용자 편집 중 안내 모달 */}
          <Dialog
            open={showLockedByOtherModal}
            onOpenChange={(open) => {
              if (!open) setShowLockedByOtherModal(false);
            }}
          >
            <DialogContent showCloseButton={false} className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>편집 불가</DialogTitle>
                <DialogDescription>
                  <span className="font-medium text-amber-400">
                    {lockedByNickname || "다른 사용자"}
                  </span>
                  님이 편집 중입니다. 편집이 완료되면 편집이 가능합니다.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton={false}>
                <Button
                  onClick={() => setShowLockedByOtherModal(false)}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  확인
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 편집자 장면 추천 확인 모달 (호스트 전용) */}
          <Dialog
            open={!!recommendedScene}
            onOpenChange={(open) => {
              if (!open) handleRecommendationCancel();
            }}
          >
            <DialogContent showCloseButton={false} className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>장면 전환 추천</DialogTitle>
                <DialogDescription>
                  {recommendedScene && (
                    <>
                      <span className="font-medium text-indigo-300">
                        {recommendedScene.recommenderNickname}
                      </span>
                      님이 &quot;
                      <span className="font-medium text-white">
                        {recommendedScene.sceneName}
                      </span>
                      &quot; 장면으로 전환할 것을 추천했습니다. 전환할까요?
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton={false} className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={handleRecommendationCancel}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  취소
                </Button>
                <Button
                  onClick={handleRecommendationConfirm}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  확인
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 편집 종료 시 미저장 변경 확인 모달 */}
          <Dialog
            open={showUnsavedConfirmModal}
            onOpenChange={(open) => {
              if (!open) handleUnsavedModalCancel();
            }}
          >
            <DialogContent showCloseButton={false} className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>저장하지 않은 변경 사항</DialogTitle>
                <DialogDescription>
                  장면 레이아웃에 저장되지 않은 변경 사항이 있습니다.
                  저장하시겠습니까?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton={false} className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={handleUnsavedModalCancel}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  편집으로 돌아가기
                </Button>
                <Button
                  variant="outline"
                  onClick={handleUnsavedModalDiscard}
                  className="border-red-600/50 text-red-400 hover:bg-red-500/10"
                >
                  저장 안 함
                </Button>
                <Button
                  onClick={handleUnsavedModalSave}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        <StudioSidebar
          studioId={studioId}
          connectedDestinations={destinations}
          selectedDestinationIds={selectedDestinationIds}
          isLive={isLive}
          activeBanner={activeBanner}
          bannerRemainingSeconds={bannerRemainingSeconds}
          onSelectBanner={setActiveBanner}
          activeAsset={activeAsset}
          onSelectAsset={setActiveAsset}
          styleState={styleState}
          onStyleChange={setStyleState}
          getPreviewStream={() => getPreviewStreamRef.current?.() ?? null}
          isRecordingLocal={isRecordingLocal}
          isRecordingCloud={isRecordingCloud}
          onStartLocalRecording={handleStartLocalRecording}
          onStopLocalRecording={handleStopLocalRecording}
          onStartCloudRecording={handleStartCloudRecording}
          onStopCloudRecording={handleStopCloudRecording}
          onlineMembers={onlineMembers}
          chatOverlayVisible={chatOverlayVisible}
          onToggleChatOverlay={() => setChatOverlayVisible((v) => !v)}
        />
      </div>
    </LayoutGroup>
  );
}
