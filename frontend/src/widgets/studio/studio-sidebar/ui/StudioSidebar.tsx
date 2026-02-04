"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import {
  MessageSquare,
  Image,
  Palette,
  Users,
  Lock,
  Circle,
  FileText,
  Layers,
  Share2,
} from "lucide-react";
import { IconButton } from "@/shared/common";
import { cn } from "@/shared/lib/utils";
import { sidebarSpring, sidebarEaseReduced } from "@/shared/lib/sidebar-motion";
import { usePrefersMotion } from "@/stores/useWorkspaceDisplayStore";
import { StudioChatPanel } from "../panels/StudioChatPanel";
import { StudioBannerPanel } from "../panels/StudioBannerPanel";
import { StudioAssetPanel } from "../panels/StudioAssetPanel";
import { StudioStylePanel } from "../panels/StudioStylePanel";
import { StudioNotePanel } from "../panels/StudioNotePanel";
import { StudioMemberPanel } from "../panels/StudioMemberPanel";
import { StudioRecordingPanel } from "../panels/StudioRecordingPanel";
import { StudioDestinationsPanel } from "../panels/StudioDestinationsPanel";
import { StudioInviteModal } from "@/widgets/studio/studio-invite-modal";
import { usePrivateChatStore } from "@/stores/usePrivateChatStore";
import { useChatMessageStore } from "@/stores/useChatMessageStore";
import type { ChatMessage } from "@/entities/chat/model";
import type { BannerItem } from "../panels/StudioBannerPanel";
import type { AssetItem } from "../panels/StudioAssetPanel";
import type { StudioStyleState } from "../panels/StudioStylePanel";
import type { OnlineMember } from "@/hooks/studio";

const EMPTY_MESSAGES: ChatMessage[] = [];

const TABS = [
  { id: "destinations", icon: Share2, label: "연동 채널" },
  { id: "chat", icon: MessageSquare, label: "채팅" },
  { id: "banner", icon: Image, label: "배너" },
  { id: "assets", icon: Layers, label: "에셋" },
  { id: "style", icon: Palette, label: "스타일" },
  { id: "notes", icon: FileText, label: "노트" },
  { id: "members", icon: Users, label: "멤버" },
  { id: "private", icon: Lock, label: "프라이빗채팅" },
  { id: "recording", icon: Circle, label: "녹화" },
] as const;

export type StudioSidebarTabId = (typeof TABS)[number]["id"];

export interface ConnectedDestinationItem {
  id: number;
  platform: string;
  channelName?: string | null;
}

interface StudioSidebarProps {
  studioId: string;
  className?: string;
  /** 스튜디오 내 연동 채널 목록 (StreamYard 스타일) */
  connectedDestinations?: ConnectedDestinationItem[];
  activeBanner?: BannerItem | null;
  /** 타이머 설정된 배너의 남은 초 (배너 오버레이·리스트 표시용) */
  bannerRemainingSeconds?: number | null;
  onSelectBanner?: (banner: BannerItem | null) => void;
  activeAsset?: AssetItem | null;
  onSelectAsset?: (asset: AssetItem | null) => void;
  styleState?: StudioStyleState;
  onStyleChange?: (style: StudioStyleState) => void;
  /** 캔버스 스트림을 가져오는 함수 (녹화용) */
  getPreviewStream?: () => MediaStream | null;
  /** 녹화 저장 위치 설정 */
  recordingStorage?: "LOCAL" | "CLOUD";
  /** 녹화 상태 (하단바와 연동) */
  isRecordingLocal?: boolean;
  onStartLocalRecording?: () => void;
  onStopLocalRecording?: () => void;
  /** 현재 접속 중인 멤버 목록 */
  onlineMembers?: OnlineMember[];
  /** 채팅 오버레이 활성화 여부 */
  isChatOverlayEnabled?: boolean;
  /** 채팅 오버레이 토글 콜백 */
  onChatOverlayToggle?: () => void;
}

export function StudioSidebar({
  studioId,
  className,
  connectedDestinations = [],
  activeBanner = null,
  bannerRemainingSeconds = null,
  onSelectBanner,
  activeAsset = null,
  onSelectAsset,
  styleState,
  onStyleChange,
  getPreviewStream,
  recordingStorage = "LOCAL",
  isRecordingLocal = false,
  onStartLocalRecording,
  onStopLocalRecording,
  onlineMembers = [],
  isChatOverlayEnabled,
  onChatOverlayToggle,
}: StudioSidebarProps) {
  const [activeTab, setActiveTab] = useState<StudioSidebarTabId | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshMembersTrigger, setRefreshMembersTrigger] = useState(0);
  const prefersMotion = usePrefersMotion();
  const sidebarTransition = prefersMotion ? sidebarSpring : sidebarEaseReduced;

  const studioIdStr = studioId;
  const markAsRead = usePrivateChatStore((state) => state.markAsRead);

  // useChatMessageStore에서 INTERNAL 메시지 수를 세어 unread 카운트 관리
  const rawMessages = useChatMessageStore(
    (s) => s.messagesByStudio[studioIdStr] ?? EMPTY_MESSAGES,
  );
  const internalMessageCount = useMemo(
    () => rawMessages.filter((m) => m.platform === "INTERNAL").length,
    [rawMessages],
  );
  const [lastSeenCount, setLastSeenCount] = useState(0);

  // 최초 히스토리 로드 시 기존 메시지를 전부 "읽음"으로 처리
  // (0 → N 전환 감지: 마운트 직후 빈 스토어에서 히스토리가 채워질 때)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && internalMessageCount > 0) {
      initializedRef.current = true;
      setLastSeenCount(internalMessageCount);
    }
  }, [internalMessageCount]);

  const unreadCount = activeTab === "private" ? 0 : Math.max(0, internalMessageCount - lastSeenCount);

  // 프라이빗 패널 열면 읽음 처리
  useEffect(() => {
    if (activeTab === "private" && studioIdStr) {
      markAsRead(studioIdStr);
      setLastSeenCount(internalMessageCount);
    }
  }, [activeTab, studioIdStr, markAsRead, internalMessageCount]);

  const handleTabClick = (id: StudioSidebarTabId) => {
    // 프라이빗 탭 열면 읽음 처리
    if (id === "private") {
      markAsRead(studioIdStr);
      setLastSeenCount(internalMessageCount);
    }
    setActiveTab((prev) => (prev === id ? null : id));
  };

  const closePanel = () => setActiveTab(null);

  const isExpanded = !!activeTab;

  return (
    <>
      <motion.aside
        layout
        layoutRoot
        className={cn(
          "flex flex-row-reverse bg-gray-900 border-l border-gray-800 shrink-0 overflow-hidden will-change-[width]",
          className
        )}
        animate={{ width: isExpanded ? 400 : 64 }}
        transition={sidebarTransition}
      >
        {/* 탭 아이콘 열: 오른쪽 벽에 고정 */}
        <div className="w-16 flex flex-col items-center py-4 gap-3 shrink-0">
          {TABS.map((tab) => (
            <div key={tab.id} className="relative">
              <IconButton
                icon={<tab.icon className="h-5 w-5 text-gray-400" />}
                label={tab.label}
                className={cn(
                  "hover:bg-gray-800",
                  activeTab === tab.id && "bg-gray-800 text-white"
                )}
                onClick={() => handleTabClick(tab.id)}
              />
              {/* 프라이빗 채팅 알림 뱃지 */}
              {tab.id === "private" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 패널 영역: 아이콘 왼쪽으로 확장 */}
        {activeTab && (
          <div className="w-80 min-w-80 flex flex-col p-3 min-h-0 overflow-auto bg-gray-900 border-r border-gray-800 shrink-0">
            {activeTab === "destinations" && (
              <StudioDestinationsPanel
                destinations={connectedDestinations}
                onClose={closePanel}
              />
            )}
            {activeTab === "chat" && (
              <StudioChatPanel
                studioId={studioIdStr}
                onClose={closePanel}
                filterPlatform={null}
                isChatOverlayEnabled={isChatOverlayEnabled}
                onChatOverlayToggle={onChatOverlayToggle}
              />
            )}
            {activeTab === "banner" && (
              <StudioBannerPanel
                studioId={studioIdStr}
                onClose={closePanel}
                onSelectBanner={onSelectBanner}
                selectedBannerId={activeBanner?.id ?? null}
                bannerRemainingSeconds={bannerRemainingSeconds}
              />
            )}
            {activeTab === "assets" && (
              <StudioAssetPanel
                studioId={studioIdStr}
                onClose={closePanel}
                onSelectAsset={onSelectAsset}
                selectedAssetId={activeAsset?.id ?? null}
              />
            )}
            {activeTab === "style" && (
              <StudioStylePanel
                studioId={studioIdStr}
                onClose={closePanel}
                onStyleChange={onStyleChange}
                initialStyle={styleState}
              />
            )}
            {activeTab === "notes" && (
              <StudioNotePanel studioId={studioIdStr} onClose={closePanel} />
            )}
            {activeTab === "members" && (
              <StudioMemberPanel
                studioId={studioId}
                onClose={closePanel}
                onInviteClick={() => setInviteOpen(true)}
                refreshTrigger={refreshMembersTrigger}
                onlineMembers={onlineMembers}
              />
            )}
            {activeTab === "private" && (
              <StudioChatPanel
                studioId={studioIdStr}
                onClose={closePanel}
                filterPlatform="INTERNAL"
              />
            )}
            {activeTab === "recording" && (
              <StudioRecordingPanel
                studioId={studioIdStr}
                onClose={closePanel}
                isRecordingLocal={isRecordingLocal}
                onStartLocalRecording={onStartLocalRecording}
                onStopLocalRecording={onStopLocalRecording}
                recordingStorage={recordingStorage}
              />
            )}
          </div>
        )}
      </motion.aside>

      <StudioInviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        studioId={studioId}
        onSuccess={() => {
          setInviteOpen(false);
          setRefreshMembersTrigger((t) => t + 1);
        }}
      />
    </>
  );
}
