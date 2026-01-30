"use client";

import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

const STORAGE_KEY = "studio-style";

export interface StudioStyleState {
  brandColor: string;
  theme: "bubble" | "classic" | "minimal" | "block";
  showDisplayNames: boolean;
  showHeadlines: boolean;
  font: string;
}

const defaultStyle: StudioStyleState = {
  brandColor: "#5d4cc7",
  theme: "bubble",
  showDisplayNames: true,
  showHeadlines: false,
  font: "",
};

interface StudioStylePanelProps {
  studioId: number;
  onClose?: () => void;
  onStyleChange?: (style: StudioStyleState) => void;
  /** 부모(송출 화면)에서 내려준 스타일 — 동기화용 */
  initialStyle?: StudioStyleState | null;
}

export function StudioStylePanel({
  studioId,
  onClose,
  onStyleChange,
  initialStyle,
}: StudioStylePanelProps) {
  const [style, setStyle] = useState<StudioStyleState>(() => {
    if (initialStyle) return { ...defaultStyle, ...initialStyle };
    if (typeof window === "undefined") return defaultStyle;
    try {
      const raw = sessionStorage.getItem(`${STORAGE_KEY}-${studioId}`);
      if (raw) return { ...defaultStyle, ...JSON.parse(raw) };
    } catch {}
    return defaultStyle;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(
        `${STORAGE_KEY}-${studioId}`,
        JSON.stringify(style),
      );
    } catch {}
    onStyleChange?.(style);
  }, [studioId, style, onStyleChange]);

  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <span className="font-semibold text-white flex items-center gap-2">
          <Palette className="h-4 w-4" />
          스타일
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
      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
        <div className="space-y-2">
          <Label className="text-gray-300 text-sm">브랜드 색상</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={style.brandColor}
              onChange={(e) =>
                setStyle((s) => ({ ...s, brandColor: e.target.value }))
              }
              className="w-10 h-10 rounded border border-gray-600 cursor-pointer"
            />
            <Input
              value={style.brandColor}
              onChange={(e) =>
                setStyle((s) => ({ ...s, brandColor: e.target.value }))
              }
              className="bg-gray-700 border-gray-600 text-white flex-1"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-gray-300 text-sm">테마</Label>
          <div className="flex flex-wrap gap-2">
            {(["bubble", "classic", "minimal", "block"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setStyle((s) => ({ ...s, theme: t }))}
                className={cn(
                  "px-3 py-1.5 rounded text-sm capitalize",
                  style.theme === t
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-gray-300 text-sm">이름 표시</Label>
          <button
            type="button"
            onClick={() =>
              setStyle((s) => ({ ...s, showDisplayNames: !s.showDisplayNames }))
            }
            className={cn(
              "w-10 h-6 rounded-full transition-colors",
              style.showDisplayNames ? "bg-indigo-600" : "bg-gray-600",
            )}
          >
            <span
              className={cn(
                "block w-4 h-4 rounded-full bg-white mt-1 transition-transform",
                style.showDisplayNames ? "translate-x-5" : "translate-x-1",
              )}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-gray-300 text-sm">헤드라인 표시</Label>
          <button
            type="button"
            onClick={() =>
              setStyle((s) => ({ ...s, showHeadlines: !s.showHeadlines }))
            }
            className={cn(
              "w-10 h-6 rounded-full transition-colors",
              style.showHeadlines ? "bg-indigo-600" : "bg-gray-600",
            )}
          >
            <span
              className={cn(
                "block w-4 h-4 rounded-full bg-white mt-1 transition-transform",
                style.showHeadlines ? "translate-x-5" : "translate-x-1",
              )}
            />
          </button>
        </div>
        <div className="space-y-2">
          <Label className="text-gray-300 text-sm">폰트</Label>
          <Input
            placeholder="폰트 이름"
            value={style.font}
            onChange={(e) => setStyle((s) => ({ ...s, font: e.target.value }))}
            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
          />
        </div>
      </div>
    </div>
  );
}
