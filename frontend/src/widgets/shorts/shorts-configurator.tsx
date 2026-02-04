"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { useRouter } from "next/navigation";
import { apiClient } from "@/shared/api/client";
import { useShortsStore } from "@/stores/useShortsStore";
import { z } from "zod";

interface ShortsConfiguratorProps {
  videoId: string;  // recordingId
}

type BgColor = "black" | "white";
type Language = "ko" | "en" | "ja" | "zh";

const GenerateResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    jobId: z.string(),
    status: z.string(),
    message: z.string(),
  }),
});

export function ShortsConfigurator({ videoId }: ShortsConfiguratorProps) {
  const router = useRouter();
  const { openResultModal, reset: resetShorts } = useShortsStore();

  const [bgColor, setBgColor] = useState<BgColor>("black");
  const [useSubtitles, setUseSubtitles] = useState(true);
  const [language, setLanguage] = useState<Language>("ko");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await apiClient.post(
        "/api/ai/shorts/generate",
        GenerateResponseSchema,
        {
          recordingId: videoId,
          needSubtitles: useSubtitles,
          subtitleLang: language,
          bgColor,
        },
      );

      resetShorts();
      openResultModal();
      router.back();
    } catch (error) {
      console.error(error);
      alert("쇼츠 생성 요청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto h-full">
      {/* [왼쪽] 미리보기 영역 */}
      <section className="flex-1 flex flex-col items-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100 min-h-[600px] justify-center">
        <h2 className="text-lg font-semibold text-gray-700 mb-6 self-start w-full">
          미리보기
        </h2>

        <div
          className={cn(
            "relative w-[320px] h-[568px] rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300 flex flex-col items-center justify-center",
            bgColor === "black"
              ? "bg-black"
              : "bg-white border border-gray-200",
          )}
        >
          {/* 가짜 콘텐츠 */}
          <div
            className={cn(
              "text-center px-6 font-bold text-2xl mb-4",
              bgColor === "black" ? "text-white" : "text-black",
            )}
          >
            AI가 생성한 타이틀입니다
          </div>

          <div className="w-40 h-24 bg-gray-700/50 rounded flex items-center justify-center text-xs text-gray-400 mb-12">
            Video Content
          </div>

          {useSubtitles && (
            <div
              className={cn(
                "absolute bottom-20 w-full text-center px-4 font-medium",
                bgColor === "black" ? "text-yellow-400" : "text-blue-600",
              )}
            >
              AI가 생성한 자막이 여기에
              <br />
              표시됩니다 ({language})
            </div>
          )}
        </div>
      </section>

      {/* [오른쪽] 설정 패널 */}
      <section className="w-full lg:w-[400px] flex flex-col gap-6">
        {/* 1. 배경색 설정 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">배경색</h3>
          <div className="flex gap-4">
            <button
              onClick={() => setBgColor("black")}
              className={cn(
                "flex-1 h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all",
                bgColor === "black"
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-gray-100 hover:border-gray-200",
              )}
            >
              <div className="w-8 h-8 bg-black rounded shadow-sm border border-gray-600" />
              <span className="text-xs text-gray-600">검은색</span>
            </button>
            <button
              onClick={() => setBgColor("white")}
              className={cn(
                "flex-1 h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all",
                bgColor === "white"
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-gray-100 hover:border-gray-200",
              )}
            >
              <div className="w-8 h-8 bg-white rounded shadow-sm border border-gray-200" />
              <span className="text-xs text-gray-600">흰색</span>
            </button>
          </div>
        </div>

        {/* 2. 자막 설정 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">자막 설정</h3>

          {/* 체크박스 */}
          <label className="flex items-center gap-3 cursor-pointer mb-6 select-none">
            <div
              className={cn(
                "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                useSubtitles
                  ? "bg-blue-600 border-blue-600"
                  : "border-gray-300",
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
            <span className="text-sm text-gray-700">자막 생성</span>
          </label>

          {/* 언어 선택 */}
          {useSubtitles && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-gray-500 mb-2">언어 선택</p>
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
                        ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                        : "border-gray-100 text-gray-600 hover:bg-gray-50",
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
          className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          onClick={handleCreate}
          disabled={isSubmitting}
        >
          {isSubmitting ? "요청 중..." : "쇼츠 생성 요청"}
        </Button>
      </section>
    </div>
  );
}
