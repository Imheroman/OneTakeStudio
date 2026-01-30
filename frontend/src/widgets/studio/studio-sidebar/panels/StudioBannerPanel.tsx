"use client";

/**
 * 배너는 로컬 전용. 캔버스(미리보기)에 합성되어 표시되며,
 * 녹화/라이브 시에는 이 캔버스 출력을 한 스트림으로 서버에 보내는 방식.
 * 서버에 배너 CRUD API 없음.
 */
import { useState, useEffect } from "react";
import { Image, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";

const STORAGE_KEY_PREFIX = "studio-banners-";

export interface BannerItem {
  id: string;
  text: string;
  timerSeconds?: number;
  isTicker?: boolean;
}

function loadBannersFromStorage(studioId: number): BannerItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${studioId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b): b is BannerItem =>
        b != null &&
        typeof b === "object" &&
        typeof (b as BannerItem).id === "string" &&
        typeof (b as BannerItem).text === "string",
    );
  } catch {
    return [];
  }
}

function saveBannersToStorage(studioId: number, banners: BannerItem[]) {
  try {
    sessionStorage.setItem(
      `${STORAGE_KEY_PREFIX}${studioId}`,
      JSON.stringify(banners),
    );
  } catch {
    /* ignore */
  }
}

interface StudioBannerPanelProps {
  studioId: number;
  onClose?: () => void;
  onSelectBanner?: (banner: BannerItem | null) => void;
  /** 송출 화면에 표시 중인 배너 ID (패널에서 하이라이트용) */
  selectedBannerId?: string | null;
}

export function StudioBannerPanel({
  studioId,
  onClose,
  onSelectBanner,
  selectedBannerId = null,
}: StudioBannerPanelProps) {
  const [banners, setBanners] = useState<BannerItem[]>(() =>
    loadBannersFromStorage(studioId),
  );
  const [inputText, setInputText] = useState("");
  const [timerSec, setTimerSec] = useState("");
  const [isTicker, setIsTicker] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setBanners(loadBannersFromStorage(studioId));
  }, [studioId]);

  useEffect(() => {
    saveBannersToStorage(studioId, banners);
  }, [studioId, banners]);

  const handleAdd = () => {
    const text = inputText.trim();
    if (!text) return;
    const newBanner: BannerItem = {
      id: `local-${Date.now()}`,
      text,
      timerSeconds: timerSec ? parseInt(timerSec, 10) : undefined,
      isTicker,
    };
    setBanners((prev) => [...prev, newBanner]);
    setInputText("");
    setTimerSec("");
  };

  const handleDelete = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      onSelectBanner?.(null);
    }
  };

  const handleSelect = (banner: BannerItem) => {
    setSelectedId(banner.id);
    onSelectBanner?.(banner);
  };

  const effectiveSelectedId = selectedBannerId ?? selectedId;

  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <span className="font-semibold text-white flex items-center gap-2">
          <Image className="h-4 w-4" />
          배너
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
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {banners.length === 0 ? (
          <p className="text-sm text-gray-500">배너를 추가하면 미리보기에 표시됩니다.</p>
        ) : (
          banners.map((b) => (
            <div
              key={b.id}
              className={cn(
                "flex items-center justify-between gap-2 p-2 rounded border cursor-pointer",
                effectiveSelectedId === b.id
                  ? "border-indigo-500 bg-indigo-900/20"
                  : "border-gray-600 bg-gray-700/50 hover:bg-gray-700",
              )}
            >
              <button
                type="button"
                className="flex-1 text-left text-sm text-gray-200 truncate"
                onClick={() => handleSelect(b)}
              >
                {b.text}
              </button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-gray-400 hover:text-red-400 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(b.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t border-gray-700 space-y-2">
        <Input
          placeholder="배너 문구 입력..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="banner-ticker"
            checked={isTicker}
            onChange={(e) => setIsTicker(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="banner-ticker" className="text-gray-300 text-sm">
            하단 스크롤 (티커)
          </Label>
        </div>
        <Input
          placeholder="타이머(초)"
          value={timerSec}
          onChange={(e) => setTimerSec(e.target.value)}
          type="number"
          className="bg-gray-700 border-gray-600 text-white"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            className="bg-indigo-600 hover:bg-indigo-700 flex-1"
          >
            <Plus className="h-4 w-4 mr-1" />
            배너 추가
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}
