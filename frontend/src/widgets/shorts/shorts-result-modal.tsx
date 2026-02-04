"use client";

import { useState } from "react";
import { useShortsStore } from "@/stores/useShortsStore";
import { apiClient } from "@/shared/api/client";
import { X, Loader2, Save, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { z } from "zod";

const STEP_LABELS: Record<string, string> = {
  AUDIO_EXTRACTION: "음성 추출 중...",
  TRANSCRIPTION: "음성 인식 중...",
  HIGHLIGHT_SELECTION: "하이라이트 선정 중...",
  VIDEO_CROP: "영상 편집 중...",
  SUBTITLE_PROCESSING: "자막 처리 중...",
  AUDIO_COMBINE: "오디오 결합 중...",
  TITLE_GENERATION: "제목 생성 중...",
};

export function ShortsResultModal() {
  const { isModalOpen, closeResultModal, shorts } = useShortsStore();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const handleSave = async (jobId: string, videoId: string) => {
    const key = `${jobId}/${videoId}`;
    if (savedIds.has(key) || savingIds.has(key)) return;

    setSavingIds((prev) => new Set(prev).add(key));
    try {
      await apiClient.patch(
        `/api/ai/shorts/${jobId}/${videoId}/save`,
        z.object({ success: z.boolean(), data: z.any() }),
      );
      setSavedIds((prev) => new Set(prev).add(key));
    } catch (err) {
      console.error("숏츠 저장 실패:", err);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (!isModalOpen) return null;

  return (
    // 배경 어둡게 (Overlay)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* 모달 컨테이너 */}
      <div className="bg-white rounded-2xl w-[90%] max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">쇼츠 선택 창</h2>
            <p className="text-sm text-gray-500">
              원하는 쇼츠를 선택하고 저장하세요 (생성된 영상은 바로 재생
              가능합니다)
            </p>
          </div>
          <button
            onClick={closeResultModal}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* 본문: 3개의 슬롯 */}
        <div className="flex-1 p-8 bg-gray-50 flex justify-center items-center gap-8">
          {shorts.map((short) => (
            <div key={short.id} className="flex flex-col gap-4 w-[280px]">
              {/* 카드 본체 (폰 화면 비율) */}
              <div
                className={cn(
                  "aspect-[9/16] rounded-2xl overflow-hidden shadow-sm border transition-all relative group bg-white",
                  short.status === "loading"
                    ? "border-gray-200 flex flex-col items-center justify-center"
                    : short.status === "completed"
                      ? "border-purple-500 shadow-purple-100 ring-2 ring-purple-100"
                      : "border-gray-200 flex items-center justify-center",
                )}
              >
                {/* 1. 로딩 중일 때 */}
                {short.status === "loading" && (
                  <div className="text-center space-y-3">
                    <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto" />
                    <p className="text-sm text-gray-700 font-medium">
                      {short.currentStepKey
                        ? STEP_LABELS[short.currentStepKey] ?? "처리 중..."
                        : "AI 생성 중..."}
                    </p>
                    {short.currentStep && short.totalSteps && (
                      <p className="text-xs text-gray-400">
                        {short.currentStep}/{short.totalSteps} 단계
                      </p>
                    )}
                  </div>
                )}

                {/* 2. 생성 완료되었을 때 (영상 표시) */}
                {short.status === "completed" && (
                  <video
                    src={short.videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover bg-slate-900"
                  />
                )}

                {/* 3. 대기 중 (아직 시작 안 함) */}
                {short.status === "idle" && (
                  <div className="text-gray-300 text-sm">대기 중</div>
                )}
              </div>

              {/* 하단 버튼 (완료되었을 때만 활성화) */}
              {(() => {
                const key = short.jobId && short.videoId ? `${short.jobId}/${short.videoId}` : "";
                const isSaved = savedIds.has(key);
                const isSaving = savingIds.has(key);
                return (
                  <button
                    disabled={short.status !== "completed" || isSaved || isSaving}
                    onClick={() => {
                      if (short.jobId && short.videoId) {
                        handleSave(short.jobId, short.videoId);
                      }
                    }}
                    className={cn(
                      "w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all",
                      isSaved
                        ? "bg-green-600 text-white cursor-default"
                        : short.status === "completed"
                          ? "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed",
                    )}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        저장 중...
                      </>
                    ) : isSaved ? (
                      <>
                        <Check className="w-4 h-4" />
                        저장 완료
                      </>
                    ) : short.status === "completed" ? (
                      <>
                        <Save className="w-4 h-4" />
                        저장하기
                      </>
                    ) : (
                      "생성 대기중"
                    )}
                  </button>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
