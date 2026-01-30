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
  onClose?: () => void;
}

function platformLabel(platform: string) {
  const p = (platform ?? "").toLowerCase();
  if (p === "youtube") return "YouTube";
  if (p === "twitch") return "Twitch";
  if (p === "facebook") return "Facebook";
  return p || "채널";
}

export function StudioDestinationsPanel({
  destinations,
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
          destinations.map((d) => (
            <div
              key={d.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md border border-gray-600 px-3 py-2",
                "bg-gray-700/50",
              )}
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium capitalize text-white">
                  {platformLabel(d.platform)}
                </span>
                <p className="text-xs text-gray-400 truncate">
                  {d.channelName ?? "-"}
                </p>
              </div>
            </div>
          ))
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
