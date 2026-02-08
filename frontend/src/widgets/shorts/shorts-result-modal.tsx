"use client";

import { useState } from "react";
import { z } from "zod";
import { useShortsStore } from "@/stores/useShortsStore";
import type { ShortItem } from "@/stores/useShortsStore";
import { X, Loader2, Play, Save, AlertCircle, CheckCircle2, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useResolvedTheme } from "@/stores/useWorkspaceThemeStore";
import { apiClient } from "@/shared/api/client";

const SaveResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional().nullable(),
});

/** AI 파이프라인 7단계 라벨 */
const STEP_LABELS: Record<string, string> = {
  AUDIO_EXTRACTION: "오디오 추출",
  TRANSCRIPTION: "음성 인식",
  HIGHLIGHT_SELECTION: "하이라이트 선정",
  VIDEO_CROP: "영상 크롭",
  SUBTITLE_PROCESSING: "자막 처리",
  AUDIO_COMBINE: "오디오 합성",
  TITLE_GENERATION: "제목 생성",
};

function StepLabel({ stepKey }: { stepKey: string | null }) {
  if (!stepKey) return null;
  return <>{STEP_LABELS[stepKey] ?? stepKey}</>;
}

function ProgressBar({
  current,
  total,
  isDark,
}: {
  current: number;
  total: number;
  isDark: boolean;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div
      className={cn(
        "w-full h-2 rounded-full overflow-hidden",
        isDark ? "bg-gray-700" : "bg-gray-200"
      )}
    >
      <div
        className="h-full bg-blue-500 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ShortCard({
  short,
  jobId,
  isDark,
  onSave,
  saving,
}: {
  short: ShortItem;
  jobId: string | null;
  isDark: boolean;
  onSave: (videoId: string) => void;
  saving: string | null;
}) {
  const streamUrl = short.streamUrl || null;

  const isSaving = saving === short.videoId;

  return (
    <div className="flex flex-col gap-4 w-[280px]">
      {/* 카드 본체 (9:16 비율) */}
      <div
        className={cn(
          "aspect-[9/16] rounded-2xl overflow-hidden shadow-sm border transition-all relative group",
          isDark ? "bg-gray-800" : "bg-white",
          short.status === "loading" &&
            (isDark
              ? "border-gray-700 flex flex-col items-center justify-center"
              : "border-gray-200 flex flex-col items-center justify-center"),
          (short.status === "completed" || short.status === "saved") &&
            "border-blue-500 ring-2 ring-blue-500/30",
          short.status === "error" &&
            (isDark ? "border-red-500/50" : "border-red-300"),
          short.status === "idle" &&
            (isDark
              ? "border-gray-700 flex items-center justify-center"
              : "border-gray-200 flex items-center justify-center")
        )}
      >
        {/* 로딩 중 */}
        {short.status === "loading" && (
          <div className="text-center space-y-4 px-6 w-full">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
            <div className="space-y-2">
              {short.currentStep != null && short.totalSteps != null ? (
                <>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isDark ? "text-gray-200" : "text-gray-700"
                    )}
                  >
                    <StepLabel stepKey={short.currentStepKey} />
                  </p>
                  <ProgressBar
                    current={short.currentStep}
                    total={short.totalSteps}
                    isDark={isDark}
                  />
                  <p
                    className={cn(
                      "text-xs",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    {short.currentStep} / {short.totalSteps} 단계
                  </p>
                </>
              ) : (
                <p
                  className={cn(
                    "text-sm font-medium",
                    isDark ? "text-gray-300" : "text-gray-500"
                  )}
                >
                  AI 생성 대기 중...
                </p>
              )}
            </div>
          </div>
        )}

        {/* 완료 / 저장됨 - 영상 재생 */}
        {(short.status === "completed" || short.status === "saved") && streamUrl && (
          <div className="w-full h-full relative">
            <video
              src={streamUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain bg-black"
            />
            {short.status === "saved" && (
              <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                저장됨
              </div>
            )}
          </div>
        )}

        {/* 에러 */}
        {short.status === "error" && (
          <div className="flex flex-col items-center justify-center text-center px-6 h-full">
            <AlertCircle
              className={cn(
                "w-10 h-10 mb-3",
                isDark ? "text-red-400" : "text-red-500"
              )}
            />
            <p
              className={cn(
                "text-sm font-medium mb-1",
                isDark ? "text-red-300" : "text-red-600"
              )}
            >
              생성 실패
            </p>
            {short.error && (
              <p
                className={cn(
                  "text-xs line-clamp-3",
                  isDark ? "text-gray-400" : "text-gray-500"
                )}
              >
                {short.error}
              </p>
            )}
          </div>
        )}

        {/* 대기 */}
        {short.status === "idle" && (
          <p
            className={cn(
              "text-sm",
              isDark ? "text-gray-500" : "text-gray-300"
            )}
          >
            대기 중
          </p>
        )}
      </div>

      {/* 하단 버튼 */}
      <button
        disabled={short.status !== "completed" || isSaving}
        onClick={() => short.videoId && onSave(short.videoId)}
        className={cn(
          "w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all",
          short.status === "saved"
            ? "bg-green-600 text-white cursor-default"
            : short.status === "completed"
            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
            : isDark
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        )}
      >
        {short.status === "saved" ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            라이브러리에 저장됨
          </>
        ) : short.status === "completed" ? (
          isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              라이브러리에 저장
            </>
          )
        ) : short.status === "error" ? (
          "생성 실패"
        ) : (
          "생성 대기중"
        )}
      </button>
    </div>
  );
}

export function ShortsResultModal() {
  const { isModalOpen, closeResultModal, shorts, jobId, markSaved } =
    useShortsStore();
  const isDark = useResolvedTheme() === "dark";
  const [saving, setSaving] = useState<string | null>(null);

  if (!isModalOpen) return null;

  const completedCount = shorts.filter(
    (s) => s.status === "completed" || s.status === "saved"
  ).length;
  const totalCount = shorts.filter((s) => s.status !== "idle").length;
  const allDone = shorts.every(
    (s) =>
      s.status === "completed" ||
      s.status === "saved" ||
      s.status === "error" ||
      s.status === "idle"
  );
  const isActive = shorts.some((s) => s.status === "loading");

  const handleSave = async (videoId: string) => {
    if (!jobId) return;
    setSaving(videoId);
    try {
      await apiClient.patch(
        `/api/ai/shorts/${jobId}/${videoId}/save`,
        SaveResponseSchema
      );
      markSaved(videoId);
    } catch (error) {
      console.error("쇼츠 저장 실패:", error);
      alert("쇼츠 저장에 실패했습니다.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          "rounded-2xl w-[90%] max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200",
          isDark ? "bg-gray-900" : "bg-white"
        )}
      >
        {/* 헤더 */}
        <div
          className={cn(
            "p-6 border-b shrink-0 flex justify-between items-center",
            isDark ? "border-gray-700" : "border-gray-200"
          )}
        >
          <div>
            <h2
              className={cn(
                "text-xl font-bold",
                isDark ? "text-white" : "text-gray-900"
              )}
            >
              AI 쇼츠 생성
            </h2>
            <p
              className={cn(
                "text-sm",
                isDark ? "text-gray-400" : "text-gray-500"
              )}
            >
              {isActive
                ? "AI가 쇼츠를 생성하고 있습니다..."
                : allDone
                ? `${completedCount}/${totalCount}개 쇼츠 완료 - 마음에 드는 쇼츠를 라이브러리에 저장하세요`
                : "쇼츠 생성 중..."}
            </p>
          </div>
          <button
            onClick={closeResultModal}
            className={cn(
              "p-2 rounded-full transition-colors",
              isDark
                ? "hover:bg-gray-800 text-gray-400"
                : "hover:bg-gray-100 text-gray-500"
            )}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 본문 */}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto p-8 flex justify-center items-start gap-8",
            isDark ? "bg-gray-800/50" : "bg-gray-50"
          )}
        >
          {shorts
            .filter((s) => s.status !== "idle")
            .map((short) => (
              <ShortCard
                key={short.id}
                short={short}
                jobId={jobId}
                isDark={isDark}
                onSave={handleSave}
                saving={saving}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
