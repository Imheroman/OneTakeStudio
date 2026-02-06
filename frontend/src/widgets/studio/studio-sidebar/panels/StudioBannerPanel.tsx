"use client";

/**
 * 배너는 로컬 전용. 캔버스(미리보기)에 합성되어 표시되며,
 * 녹화/라이브 시에는 이 캔버스 출력을 한 스트림으로 서버에 보내는 방식.
 * 서버에 배너 CRUD API 없음.
 */
import { useState, useEffect } from "react";
import { Image, Plus, Trash2, Play, Square } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";

function formatRemainingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const STORAGE_KEY_PREFIX = "studio-banners-";

export interface BannerItem {
  id: string;
  text: string;
  timerSeconds?: number;
  isTicker?: boolean;
}

function loadBannersFromStorage(studioId: string): BannerItem[] {
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
        typeof (b as BannerItem).text === "string"
    );
  } catch {
    return [];
  }
}

function saveBannersToStorage(studioId: string, banners: BannerItem[]) {
  try {
    sessionStorage.setItem(
      `${STORAGE_KEY_PREFIX}${studioId}`,
      JSON.stringify(banners)
    );
  } catch {
    /* ignore */
  }
}

interface StudioBannerPanelProps {
  studioId: string;
  onClose?: () => void;
  onSelectBanner?: (banner: BannerItem | null) => void;
  /** 송출 화면에 표시 중인 배너 ID (패널에서 하이라이트용) */
  selectedBannerId?: string | null;
  /** 타이머 설정된 배너의 남은 초 (재생 중일 때 표시) */
  bannerRemainingSeconds?: number | null;
}

export function StudioBannerPanel({
  studioId,
  onClose,
  onSelectBanner,
  selectedBannerId = null,
  bannerRemainingSeconds = null,
}: StudioBannerPanelProps) {
  const [banners, setBanners] = useState<BannerItem[]>(() =>
    loadBannersFromStorage(studioId)
  );
  const [inputText, setInputText] = useState("");
  const [timerH, setTimerH] = useState("");
  const [timerM, setTimerM] = useState("");
  const [timerS, setTimerS] = useState("");
  const [isTicker, setIsTicker] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setBanners(loadBannersFromStorage(studioId));
  }, [studioId]);

  useEffect(() => {
    if (!selectedBannerId) setSelectedId(null);
  }, [selectedBannerId]);

  useEffect(() => {
    saveBannersToStorage(studioId, banners);
  }, [studioId, banners]);

  const handleAdd = () => {
    const text = inputText.trim();
    if (!text) return;
    const h = parseInt(timerH, 10) || 0;
    const m = parseInt(timerM, 10) || 0;
    const s = parseInt(timerS, 10) || 0;
    const totalSeconds = h * 3600 + m * 60 + s;
    const newBanner: BannerItem = {
      id: `local-${Date.now()}`,
      text,
      timerSeconds: totalSeconds > 0 ? totalSeconds : undefined,
      isTicker,
    };
    setBanners((prev) => [...prev, newBanner]);
    setInputText("");
    setTimerH("");
    setTimerM("");
    setTimerS("");
  };

  const handleDelete = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    if (selectedBannerId === id || selectedId === id) {
      setSelectedId(null);
      onSelectBanner?.(null);
    }
  };

  const handlePlay = (banner: BannerItem) => {
    setSelectedId(banner.id);
    onSelectBanner?.(banner);
  };

  const handleStop = () => {
    setSelectedId(null);
    onSelectBanner?.(null);
  };

  const isPlaying = (bannerId: string) =>
    (selectedBannerId ?? selectedId) === bannerId;
  const playingBanner = banners.find(
    (b) => b.id === (selectedBannerId ?? selectedId)
  );
  const showRemaining =
    playingBanner?.timerSeconds != null &&
    playingBanner.timerSeconds > 0 &&
    bannerRemainingSeconds != null;

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

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* 배너 리스트 */}
        <div className="p-3 pb-0">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            배너 리스트
          </h4>
          {banners.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              배너를 추가하면 미리보기에 표시됩니다.
            </p>
          ) : (
            <div className="space-y-2">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border transition-colors",
                    isPlaying(b.id)
                      ? "border-indigo-500 bg-indigo-900/30"
                      : "border-gray-600 bg-gray-700/50 hover:bg-gray-700"
                  )}
                >
                  <span className="flex-1 text-sm text-gray-200 truncate min-w-0">
                    {b.text}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {isPlaying(b.id) ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStop();
                          }}
                          title="중단"
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                        {showRemaining && (
                          <span className="text-[10px] font-mono text-indigo-300 tabular-nums">
                            {formatRemainingTime(bannerRemainingSeconds!)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlay(b);
                          }}
                          title="재생"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        {b.timerSeconds != null && b.timerSeconds > 0 && (
                          <span className="text-[10px] font-mono text-gray-500 tabular-nums">
                            {formatRemainingTime(b.timerSeconds)}
                          </span>
                        )}
                      </div>
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/20 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(b.id);
                      }}
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 배너 생성 */}
        <div className="p-3 pt-4 mt-3 border-t border-gray-700">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            배너 생성
          </h4>
          <div className="space-y-3">
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
                className="rounded border-gray-600 bg-gray-700"
              />
              <Label htmlFor="banner-ticker" className="text-gray-300 text-sm">
                하단 스크롤 (티커)
              </Label>
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">
                타이머 (비워두면 무제한)
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  placeholder="00"
                  value={timerH}
                  onChange={(e) =>
                    setTimerH(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  type="text"
                  inputMode="numeric"
                  className="bg-gray-700 border-gray-600 text-white text-center h-9 flex-1"
                />
                <span className="text-gray-500 text-sm">시</span>
                <Input
                  placeholder="00"
                  value={timerM}
                  onChange={(e) =>
                    setTimerM(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  type="text"
                  inputMode="numeric"
                  className="bg-gray-700 border-gray-600 text-white text-center h-9 flex-1"
                />
                <span className="text-gray-500 text-sm">분</span>
                <Input
                  placeholder="00"
                  value={timerS}
                  onChange={(e) =>
                    setTimerS(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  type="text"
                  inputMode="numeric"
                  className="bg-gray-700 border-gray-600 text-white text-center h-9 flex-1"
                />
                <span className="text-gray-500 text-sm">초</span>
              </div>
            </div>
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
              {onClose && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onClose}
                >
                  취소
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
