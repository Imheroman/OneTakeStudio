"use client";

import { useState } from "react";
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
import type { BannerItem } from "../panels/StudioBannerPanel";
import type { AssetItem } from "../panels/StudioAssetPanel";
import type { StudioStyleState } from "../panels/StudioStylePanel";

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
}: StudioSidebarProps) {
  const [activeTab, setActiveTab] = useState<StudioSidebarTabId | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const handleTabClick = (id: StudioSidebarTabId) => {
    setActiveTab((prev) => (prev === id ? null : id));
  };

  const closePanel = () => setActiveTab(null);

  const studioIdNum = Number(studioId) || 0;

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
            <IconButton
              key={tab.id}
              icon={<tab.icon className="h-5 w-5 text-gray-400" />}
              label={tab.label}
              className={cn(
                "hover:bg-gray-800",
                activeTab === tab.id && "bg-gray-800 text-white",
              )}
              onClick={() => handleTabClick(tab.id)}
            />
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
              />
            )}
          </div>
        )}
      </aside>

      <StudioInviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        studioId={studioId}
        onSuccess={closePanel}
      />
    </>
  );
}
