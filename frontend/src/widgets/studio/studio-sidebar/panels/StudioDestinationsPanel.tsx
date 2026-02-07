"use client";

import Link from "next/link";
import { Share2, ExternalLink } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface ConnectedDestinationItem {
  id: number;
  platform: string;
  channelName?: string | null;
}

interface StudioDestinationsPanelProps {
  destinations: ConnectedDestinationItem[];
  selectedDestinationIds?: number[];
  isLive?: boolean;
  onClose?: () => void;
}

function platformLabel(platform: string) {
  const p = (platform ?? "").toLowerCase();
  if (p === "youtube") return "YouTube";
  if (p === "twitch") return "Twitch";
  if (p === "chzzk") return "치지직";
  if (p === "facebook") return "Facebook";
  return p || "채널";
}

function PlatformIcon({ platform }: { platform: string }) {
  const p = (platform ?? "").toLowerCase();

  if (p === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/>
      </svg>
    );
  }

  if (p === "twitch") {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" fill="#9146FF"/>
      </svg>
    );
  }

  if (p === "chzzk") {
    return (
      <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center text-white font-bold text-xs">
        ㅊ
      </div>
    );
  }

  if (p === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
      </svg>
    );
  }

  // 기본 아이콘
  return (
    <div className="w-6 h-6 rounded bg-gray-600 flex items-center justify-center text-white">
      <Share2 className="w-3 h-3" />
    </div>
  );
}

export function StudioDestinationsPanel({
  destinations,
  selectedDestinationIds = [],
  isLive = false,
  onClose,
}: StudioDestinationsPanelProps) {
  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <span className="font-semibold text-white flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          연동 채널
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {destinations.length === 0 ? (
          <p className="text-sm text-gray-400">
            연동된 채널이 없습니다.
            <br />
            채널 관리에서 송출할 채널을 추가해 주세요.
          </p>
        ) : (
          destinations.map((d) => {
            const isSelected = isLive && selectedDestinationIds.includes(d.id);
            return (
              <div
                key={d.id}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                  isSelected
                    ? "border-green-500/60 bg-green-500/10"
                    : "border-gray-600 bg-gray-700/50 hover:bg-gray-700",
                )}
              >
                <PlatformIcon platform={d.platform} />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-white">
                    {platformLabel(d.platform)}
                  </span>
                  <p className="text-xs text-gray-400 truncate">
                    {d.channelName ?? "-"}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    isSelected
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-600/50 text-gray-500",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block w-2 h-2 rounded-full",
                      isSelected ? "bg-green-400" : "bg-gray-500",
                    )}
                  />
                  {isSelected ? "ON" : "OFF"}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="p-3 border-t border-gray-700">
        <Link
          href="/channels"
          className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
        >
          <ExternalLink className="h-4 w-4" />
          채널 관리에서 추가/수정
        </Link>
      </div>
    </div>
  );
}
