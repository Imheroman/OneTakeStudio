"use client";

import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

const STORAGE_KEY = "studio-style";

export type StudioThemeType = "circle" | "original" | "square";

export interface StudioStyleState {
  brandColor: string;
  theme: StudioThemeType;
}

const THEME_OPTIONS: { value: StudioThemeType; label: string }[] = [
  { value: "original", label: "원본" },
  { value: "circle", label: "원형" },
  { value: "square", label: "정방형" },
];

const defaultStyle: StudioStyleState = {
  brandColor: "#5d4cc7",
  theme: "circle",
};

interface StudioStylePanelProps {
  studioId: string | number;
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
  const migrateTheme = (t: string): StudioThemeType => {
    if (t === "circle" || t === "original" || t === "square") return t;
    if (t === "bubble") return "circle";
    return "original"; // classic, minimal, block 등 기존 값
  };

  const [style, setStyle] = useState<StudioStyleState>(() => {
    if (initialStyle) {
      const s = { ...defaultStyle, ...initialStyle };
      s.theme = migrateTheme(s.theme);
      return s;
    }
    if (typeof window === "undefined") return defaultStyle;
    try {
      const raw = sessionStorage.getItem(`${STORAGE_KEY}-${studioId}`);
      if (raw) {
        const parsed = { ...defaultStyle, ...JSON.parse(raw) };
        parsed.theme = migrateTheme(parsed.theme);
        return parsed;
      }
    } catch {}
    return defaultStyle;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(
        `${STORAGE_KEY}-${studioId}`,
        JSON.stringify(style)
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
          <Label className="text-gray-300 text-sm">캠 형태</Label>
          <div className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStyle((s) => ({ ...s, theme: value }))}
                className={cn(
                  "px-3 py-1.5 rounded text-sm",
                  style.theme === value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
