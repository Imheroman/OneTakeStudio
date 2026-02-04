"use client";

import { useState, useEffect, type MutableRefObject } from "react";
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
import type { Client } from "@stomp/stompjs";
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
import type { BannerItem } from "../panels/StudioBannerPanel";
import type { AssetItem } from "../panels/StudioAssetPanel";
import type { StudioStyleState } from "../panels/StudioStylePanel";
import type { OnlineMember } from "@/hooks/studio";

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
  /** STOMP WebSocket 클라이언트 (실시간 채팅용) */
  stompClient?: MutableRefObject<Client | null>;
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
  stompClient,
}: StudioSidebarProps) {
  const [activeTab, setActiveTab] = useState<StudioSidebarTabId | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshMembersTrigger, setRefreshMembersTrigger] = useState(0);
  const prefersMotion = usePrefersMotion();
  const sidebarTransition = prefersMotion ? sidebarSpring : sidebarEaseReduced;

  const studioIdNum = studioId;
  const unreadCount = usePrivateChatStore(
    (state) => state.unreadCounts[studioIdNum] ?? 0
  );
  const markAsRead = usePrivateChatStore((state) => state.markAsRead);
  const setUnreadCount = usePrivateChatStore((state) => state.setUnreadCount);

  // 프라이빗 메시지 WebSocket 알림 (프라이빗 패널이 열려있지 않을 때 읽지 않은 수 추적)
  useEffect(() => {
    if (activeTab === "private" || !studioIdNum) return;
    const client = stompClient?.current;
    if (!client?.connected) return;

    const sub = client.subscribe(
      `/topic/chat/${studioIdNum}`,
      (message) => {
        try {
          const chatMsg = JSON.parse(message.body);
          if (chatMsg.platform === "INTERNAL") {
            setUnreadCount(
              studioIdNum,
              (usePrivateChatStore.getState().unreadCounts[studioIdNum] ?? 0) + 1,
            );
          }
        } catch {
          // 조용히 실패
        }
      },
    );

    return () => {
      sub.unsubscribe();
    };
  }, [studioIdNum, activeTab, stompClient?.current?.connected, setUnreadCount]);

  // 프라이빗 패널 열면 읽음 처리 (WebSocket 기반이므로 별도 fetch 불필요)
  useEffect(() => {
    if (activeTab === "private" && studioIdNum) {
      markAsRead(studioIdNum);
    }
  }, [activeTab, studioIdNum, markAsRead]);

  const handleTabClick = (id: StudioSidebarTabId) => {
    // 프라이빗 탭 열면 읽음 처리
    if (id === "private") {
      markAsRead(studioIdNum);
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
                studioId={studioIdNum}
                onClose={closePanel}
                filterPlatform={null}
                stompClient={stompClient}
              />
            )}
            {activeTab === "banner" && (
              <StudioBannerPanel
                studioId={studioIdNum}
                onClose={closePanel}
                onSelectBanner={onSelectBanner}
                selectedBannerId={activeBanner?.id ?? null}
                bannerRemainingSeconds={bannerRemainingSeconds}
              />
            )}
            {activeTab === "assets" && (
              <StudioAssetPanel
                studioId={studioIdNum}
                onClose={closePanel}
                onSelectAsset={onSelectAsset}
                selectedAssetId={activeAsset?.id ?? null}
              />
            )}
            {activeTab === "style" && (
              <StudioStylePanel
                studioId={studioIdNum}
                onClose={closePanel}
                onStyleChange={onStyleChange}
                initialStyle={styleState}
              />
            )}
            {activeTab === "notes" && (
              <StudioNotePanel studioId={studioIdNum} onClose={closePanel} />
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
                studioId={studioIdNum}
                onClose={closePanel}
                filterPlatform="INTERNAL"
                stompClient={stompClient}
              />
            )}
            {activeTab === "recording" && (
              <StudioRecordingPanel
                studioId={studioIdNum}
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
