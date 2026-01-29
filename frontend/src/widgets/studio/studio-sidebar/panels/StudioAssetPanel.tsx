"use client";

import { useState } from "react";
import { ImageIcon, Layers, Video, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

export type AssetType = "logo" | "overlay" | "video";

export interface AssetItem {
  id: string;
  type: AssetType;
  name: string;
  fileUrl?: string;
}

const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  logo: "로고",
  overlay: "오버레이",
  video: "비디오 클립",
};

interface StudioAssetPanelProps {
  studioId: number;
  onClose?: () => void;
  onSelectAsset?: (asset: AssetItem | null) => void;
}

const MOCK_OVERLAYS = [
  { id: "o1", type: "overlay" as const, name: "Like and Subscribe" },
  { id: "o2", type: "overlay" as const, name: "Welcome" },
  { id: "o3", type: "overlay" as const, name: "Q&A" },
  { id: "o4", type: "overlay" as const, name: "Achievement" },
  { id: "o5", type: "overlay" as const, name: "Breaking News" },
];

export function StudioAssetPanel({
  studioId,
  onClose,
  onSelectAsset,
}: StudioAssetPanelProps) {
  const [logos, setLogos] = useState<AssetItem[]>([]);
  const [overlays] = useState<AssetItem[]>(MOCK_OVERLAYS);
  const [videos, setVideos] = useState<AssetItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (asset: AssetItem) => {
    const next = selectedId === asset.id ? null : asset.id;
    setSelectedId(next);
    onSelectAsset?.(next ? asset : null);
  };

  const handleDelete = (id: string, type: AssetType) => {
    if (type === "logo") setLogos((prev) => prev.filter((a) => a.id !== id));
    if (type === "video") setVideos((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      onSelectAsset?.(null);
    }
  };

  const section = (
    title: string,
    Icon: React.ComponentType<{ className?: string }>,
    items: AssetItem[],
    onDelete?: (id: string) => void,
  ) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((a) => (
          <div
            key={a.id}
            className={cn(
              "flex items-center justify-between p-2 rounded border cursor-pointer",
              selectedId === a.id
                ? "border-indigo-500 bg-indigo-900/20"
                : "border-gray-600 bg-gray-700/50 hover:bg-gray-700",
            )}
          >
            <button
              type="button"
              className="flex-1 text-left text-xs text-gray-200 truncate"
              onClick={() => handleSelect(a)}
            >
              {a.name}
            </button>
            {onDelete && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-gray-400 hover:text-red-400 shrink-0 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(a.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        {title === "Logo" && (
          <div className="flex items-center justify-center p-2 rounded border border-dashed border-gray-600 text-gray-400 text-xs hover:bg-gray-700">
            + 로고 추가
          </div>
        )}
        {title === "Video clips" && (
          <>
            <div className="flex items-center justify-center p-2 rounded border border-dashed border-gray-600 text-gray-400 text-xs hover:bg-gray-700">
              + 인트로
            </div>
            <div className="flex items-center justify-center p-2 rounded border border-dashed border-gray-600 text-gray-400 text-xs hover:bg-gray-700">
              + 아웃트로
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <span className="font-semibold text-white">에셋</span>
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
      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
        {section("Logo", ImageIcon, logos, (id) => handleDelete(id, "logo"))}
        {section("Overlay", Layers, overlays)}
        {section("Video clips", Video, videos, (id) =>
          handleDelete(id, "video"),
        )}
      </div>
    </div>
  );
}
