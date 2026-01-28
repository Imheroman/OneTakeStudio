"use client";

import { useShortsStore } from "@/stores/useShortsStore";
import { X, Loader2, Play, Download, Save } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function ShortsResultModal() {
  const { isModalOpen, closeResultModal, shorts } = useShortsStore();

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
                    : "border-purple-500 shadow-purple-100 ring-2 ring-purple-100",
                )}
              >
                {/* 1. 로딩 중일 때 */}
                {short.status === "loading" && (
                  <div className="text-center space-y-3">
                    <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 font-medium">
                      AI 생성 중...
                    </p>
                  </div>
                )}

                {/* 2. 생성 완료되었을 때 (영상 표시) */}
                {short.status === "completed" && (
                  <>
                    {/* 실제로는 여기에 <video> 태그가 들어갑니다 */}
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                      <span className="text-white text-xs opacity-50 absolute top-4">
                        Shorts #{short.id}
                      </span>

                      {/* 재생 아이콘 (Hover 시 등장) */}
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform cursor-pointer">
                        <Play className="w-6 h-6 text-white fill-white ml-1" />
                      </div>
                    </div>
                  </>
                )}

                {/* 3. 대기 중 (아직 시작 안 함) */}
                {short.status === "idle" && (
                  <div className="text-gray-300 text-sm">대기 중</div>
                )}
              </div>

              {/* 하단 버튼 (완료되었을 때만 활성화) */}
              <button
                disabled={short.status !== "completed"}
                className={cn(
                  "w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all",
                  short.status === "completed"
                    ? "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed",
                )}
              >
                {short.status === "completed" ? (
                  <>
                    <Save className="w-4 h-4" />
                    저장하기
                  </>
                ) : (
                  "생성 대기중"
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
