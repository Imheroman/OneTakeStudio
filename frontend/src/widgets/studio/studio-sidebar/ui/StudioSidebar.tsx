"use client";

import { useState, useEffect } from "react";
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
import { getChatHistory } from "@/shared/api/studio-chat";
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
  onSelectBanner?: (banner: BannerItem | null) => void;
  activeAsset?: AssetItem | null;
  onSelectAsset?: (asset: AssetItem | null) => void;
  styleState?: StudioStyleState;
  onStyleChange?: (style: StudioStyleState) => void;
  /** 캔버스 스트림을 가져오는 함수 (녹화용) */
  getPreviewStream?: () => MediaStream | null;
  /** 녹화 저장 위치 설정 */
  recordingStorage?: "LOCAL" | "CLOUD";
  /** 현재 접속 중인 멤버 목록 */
  onlineMembers?: OnlineMember[];
}

export function StudioSidebar({
  studioId,
  className,
  connectedDestinations = [],
  activeBanner = null,
  onSelectBanner,
  activeAsset = null,
  onSelectAsset,
  styleState,
  onStyleChange,
  getPreviewStream,
  recordingStorage = "LOCAL",
  onlineMembers = [],
}: StudioSidebarProps) {
  const [activeTab, setActiveTab] = useState<StudioSidebarTabId | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshMembersTrigger, setRefreshMembersTrigger] = useState(0);

  const studioIdNum = Number(studioId) || 0;
  const unreadCount = usePrivateChatStore((state) => state.unreadCounts[studioIdNum] ?? 0);
  const lastSeenId = usePrivateChatStore((state) => state.lastSeenMessageIds[studioIdNum]);
  const markAsRead = usePrivateChatStore((state) => state.markAsRead);
  const setUnreadCount = usePrivateChatStore((state) => state.setUnreadCount);
  const setLastSeenMessageId = usePrivateChatStore((state) => state.setLastSeenMessageId);

  // 프라이빗 메시지 폴링 (프라이빗 패널이 열려있지 않을 때만)
  useEffect(() => {
    if (activeTab === "private" || studioIdNum === 0) return;

    const checkNewPrivateMessages = async () => {
      try {
        const messages = await getChatHistory(studioIdNum);
        const privateMessages = messages.filter((m) => m.platform === "INTERNAL");

        if (privateMessages.length === 0) return;

        // 가장 최근 메시지 ID
        const latestMessageId = privateMessages[0]?.messageId;

        // 처음 로드 시 lastSeenId 설정
        if (!lastSeenId && latestMessageId) {
          setLastSeenMessageId(studioIdNum, latestMessageId);
          return;
        }

        // 새 메시지가 있으면 카운트 업데이트
        if (latestMessageId && latestMessageId !== lastSeenId) {
          const lastSeenIndex = privateMessages.findIndex(
            (m) => m.messageId === lastSeenId
          );
          const newCount = lastSeenIndex === -1 ? privateMessages.length : lastSeenIndex;
          if (newCount > 0) {
            setUnreadCount(studioIdNum, newCount);
          }
        }
      } catch (e) {
        // 조용히 실패
      }
    };

    checkNewPrivateMessages();
    const interval = setInterval(checkNewPrivateMessages, 5000); // 5초마다 체크

    return () => clearInterval(interval);
  }, [studioIdNum, activeTab, lastSeenId, setUnreadCount, setLastSeenMessageId]);

  // 프라이빗 패널 열면 lastSeenId 업데이트
  useEffect(() => {
    if (activeTab !== "private" || studioIdNum === 0) return;

    const updateLastSeen = async () => {
      try {
        const messages = await getChatHistory(studioIdNum);
        const privateMessages = messages.filter((m) => m.platform === "INTERNAL");
        if (privateMessages.length > 0) {
          setLastSeenMessageId(studioIdNum, privateMessages[0].messageId);
        }
      } catch (e) {
        // 조용히 실패
      }
    };

    updateLastSeen();
  }, [activeTab, studioIdNum, setLastSeenMessageId]);

  const handleTabClick = (id: StudioSidebarTabId) => {
    // 프라이빗 탭 열면 읽음 처리
    if (id === "private") {
      markAsRead(studioIdNum);
    }
    setActiveTab((prev) => (prev === id ? null : id));
  };

  const closePanel = () => setActiveTab(null);

  return (
    <>
      <aside
        className={cn(
          "flex bg-gray-900 border-l border-gray-800 shrink-0",
          activeTab ? "w-[25rem]" : "w-16",
          className,
        )}
      >
        {/* 탭 아이콘 열 */}
        <div className="w-16 flex flex-col items-center py-4 gap-3 border-r border-gray-800 shrink-0">
          {TABS.map((tab) => (
            <div key={tab.id} className="relative">
              <IconButton
                icon={<tab.icon className="h-5 w-5 text-gray-400" />}
                label={tab.label}
                className={cn(
                  "hover:bg-gray-800",
                  activeTab === tab.id && "bg-gray-800 text-white",
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

        {/* 패널 영역: 넉넉한 너비로 전송 버튼 등이 잘리지 않도록 */}
          {activeTab && (
          <div className="w-80 min-w-80 flex flex-col p-3 min-h-0 overflow-auto bg-gray-900">
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
              />
            )}
            {activeTab === "banner" && (
              <StudioBannerPanel
                studioId={studioIdNum}
                onClose={closePanel}
                onSelectBanner={onSelectBanner}
                selectedBannerId={activeBanner?.id ?? null}
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
              />
            )}
            {activeTab === "recording" && (
              <StudioRecordingPanel
                studioId={studioIdNum}
                onClose={closePanel}
                getPreviewStream={getPreviewStream}
                recordingStorage={recordingStorage}
              />
            )}
          </div>
        )}
      </aside>

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
