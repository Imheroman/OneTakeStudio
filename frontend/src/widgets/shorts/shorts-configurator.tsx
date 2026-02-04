"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { useRouter } from "next/navigation";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";

/** 쇼츠 API는 백엔드 미구현 → MSW 모킹 시에만 생성 요청 가능 */
const isShortsApiAvailable = () =>
  process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

interface ShortsConfiguratorProps {
  videoId: string;
}

type BgColor = "black" | "white";
type Language = "ko" | "en" | "ja" | "zh";

export function ShortsConfigurator({ videoId }: ShortsConfiguratorProps) {
  const router = useRouter();
  const shortsApiAvailable = isShortsApiAvailable();
  const isDark = useResolvedTheme() === "dark";

  const [bgColor, setBgColor] = useState<BgColor>("black");
  const [useSubtitles, setUseSubtitles] = useState(true);
  const [language, setLanguage] = useState<Language>("ko");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (isSubmitting) return;

    if (!shortsApiAvailable) return; // 버튼 비활성화로 진입 불가, 방어용

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/shorts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          bgColor,
          useSubtitles,
          language,
        }),
      });

      if (!response.ok) throw new Error("Failed to start generation");

      alert(
        "쇼츠 생성이 시작되었습니다!\n잠시 후 상단 알림을 통해 확인하실 수 있습니다."
      );
      router.back();
    } catch (error) {
      console.error(error);
      alert("쇼츠 생성 요청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full items-start justify-center">
      {/* [왼쪽] 미리보기 카드 */}
      <div className="flex flex-col items-center lg:items-start">
        <div
          className={cn(
            "relative w-[320px] h-[568px] shrink-0 rounded-2xl overflow-hidden transition-colors duration-300 flex flex-col",
            bgColor === "black" ? "bg-black" : "bg-white border border-gray-200"
          )}
        >
          {/* 상단 여백 + 타이틀 */}
          <div
            className={cn(
              "text-center px-6 font-bold text-2xl py-4 shrink-0",
              bgColor === "black" ? "text-white" : "text-black"
            )}
          >
            AI가 생성한 타이틀입니다
          </div>

          {/* Video 영역: 상·하단 동일 여백(py-6)으로 중앙 배치 */}
          <div className="flex-1 min-h-0 flex items-center justify-center py-6 px-0">
            <div className="w-full h-full max-h-full aspect-9/16 bg-gray-700/50 flex items-center justify-center text-xs text-gray-400 rounded overflow-hidden">
              Video Content
            </div>
          </div>

          {/* 하단 여백 (자막 영역) */}
          <div className="shrink-0 h-16" />

          {useSubtitles && (
            <div
              className={cn(
                "absolute bottom-4 left-0 right-0 w-full text-center px-4 font-medium",
                bgColor === "black" ? "text-yellow-400" : "text-blue-600"
              )}
            >
              AI가 생성한 자막이 여기에
              <br />
              표시됩니다 ({language})
            </div>
          )}
        </div>
      </div>

      {/* [오른쪽] 설정 카드들 */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4 shrink-0">
        {/* 1. 배경색 */}
        <div
          className={cn(
            "p-5 rounded-xl border backdrop-blur-sm",
            isDark
              ? "bg-white/5 border-white/10"
              : "bg-white/70 border-gray-200/80"
          )}
        >
          <h3
            className={cn(
              "font-semibold mb-3",
              isDark ? "text-white/90" : "text-gray-900"
            )}
          >
            배경색
          </h3>
          <div className="flex gap-4">
            <button
              onClick={() => setBgColor("black")}
              className={cn(
                "flex-1 h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all",
                bgColor === "black"
                  ? isDark
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-blue-500 bg-blue-50/50"
                  : isDark
                  ? "border-white/20 hover:border-white/30"
                  : "border-gray-100 hover:border-gray-200"
              )}
            >
              <div className="w-8 h-8 bg-black rounded shadow-sm border border-gray-600" />
              <span
                className={cn(
                  "text-xs",
                  isDark ? "text-white/70" : "text-gray-600"
                )}
              >
                검은색
              </span>
            </button>
            <button
              onClick={() => setBgColor("white")}
              className={cn(
                "flex-1 h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all",
                bgColor === "white"
                  ? isDark
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-blue-500 bg-blue-50/50"
                  : isDark
                  ? "border-white/20 hover:border-white/30"
                  : "border-gray-100 hover:border-gray-200"
              )}
            >
              <div className="w-8 h-8 bg-white rounded shadow-sm border border-gray-200" />
              <span
                className={cn(
                  "text-xs",
                  isDark ? "text-white/70" : "text-gray-600"
                )}
              >
                흰색
              </span>
            </button>
          </div>
        </div>

        {/* 2. 자막 설정 */}
        <div
          className={cn(
            "p-5 rounded-xl border backdrop-blur-sm",
            isDark
              ? "bg-white/5 border-white/10"
              : "bg-white/70 border-gray-200/80"
          )}
        >
          <h3
            className={cn(
              "font-semibold mb-3",
              isDark ? "text-white/90" : "text-gray-900"
            )}
          >
            자막 설정
          </h3>

          {/* 체크박스 */}
          <label className="flex items-center gap-3 cursor-pointer mb-4 select-none">
            <div
              className={cn(
                "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                useSubtitles ? "bg-blue-600 border-blue-600" : "border-gray-300"
              )}
            >
              {useSubtitles && <span className="text-white text-xs">✔</span>}
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={useSubtitles}
              onChange={(e) => setUseSubtitles(e.target.checked)}
            />
            <span
              className={cn(
                "text-sm",
                isDark ? "text-white/80" : "text-gray-700"
              )}
            >
              자막 생성
            </span>
          </label>

          {/* 언어 선택 */}
          {useSubtitles && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <p
                className={cn(
                  "text-xs mb-2",
                  isDark ? "text-white/50" : "text-gray-500"
                )}
              >
                언어 선택
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "ko", label: "한국어", flag: "🇰🇷" },
                  { id: "en", label: "English", flag: "🇺🇸" },
                  { id: "ja", label: "日本語", flag: "🇯🇵" },
                  { id: "zh", label: "中文", flag: "🇨🇳" },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setLanguage(lang.id as Language)}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-lg border text-sm transition-all",
                      language === lang.id
                        ? isDark
                          ? "border-blue-500 bg-blue-500/20 text-blue-300 font-medium"
                          : "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                        : isDark
                        ? "border-white/20 text-white/70 hover:bg-white/5"
                        : "border-gray-100 text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. 생성 요청 버튼 */}
        <Button
          className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          onClick={handleCreate}
          disabled={isSubmitting || !shortsApiAvailable}
        >
          {isSubmitting
            ? "요청 중..."
            : shortsApiAvailable
            ? "쇼츠 생성 요청"
            : "준비 중 (API 미구현)"}
        </Button>
        {!shortsApiAvailable && (
          <p
            className={cn(
              "text-xs text-center",
              isDark ? "text-white/50" : "text-gray-500"
            )}
          >
            쇼츠 API는 백엔드 미구현입니다. MSW 활성화 시 체험 가능.
          </p>
        )}
      </div>
    </div>
  );
}
