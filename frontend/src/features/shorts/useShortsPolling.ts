import { useEffect, useRef } from "react";
import { z } from "zod";
import { useShortsStore } from "@/stores/useShortsStore";
import { apiClient } from "@/shared/api/client";

/** 백엔드 GET /api/ai/shorts/status 응답 스키마 (ApiResponse 래퍼 포함) */
const AiShortsStatusApiSchema = z.object({
  success: z.boolean(),
  data: z.object({
    jobId: z.string().optional().nullable(),
    status: z.string(),
    totalCount: z.number(),
    completedCount: z.number(),
    shorts: z
      .array(
        z.object({
          videoId: z.string(),
          status: z.string(),
          currentStep: z.number().optional().nullable(),
          totalSteps: z.number().optional().nullable(),
          currentStepKey: z.string().optional().nullable(),
          error: z.string().optional().nullable(),
        })
      )
      .optional()
      .nullable(),
  }),
});

export const useShortsPolling = () => {
  const { isPolling, updateShortsFromServer, addNotification, stopPolling } =
    useShortsStore();
  const prevCountRef = useRef(0);
  const hasLoggedErrorRef = useRef(false);

  useEffect(() => {
    if (!isPolling) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await apiClient.get(
          "/api/ai/shorts/status",
          AiShortsStatusApiSchema,
        );

        hasLoggedErrorRef.current = false;

        const { jobId, status, completedCount, shorts } = response.data;

        if (status === "processing" || status === "completed" || status === "error") {
          // 서버 shorts 상세 데이터로 업데이트 (단계 정보 포함)
          updateShortsFromServer(jobId ?? null, shorts ?? null, completedCount);

          if (completedCount > prevCountRef.current) {
            addNotification(
              `${completedCount}번째 쇼츠 생성이 완료되었습니다!`,
            );
            prevCountRef.current = completedCount;
          }

          // 모든 쇼츠 완료 또는 에러 시 폴링 중단
          if (status === "completed" || status === "error") {
            stopPolling();
          }
        }
      } catch (error) {
        if (!hasLoggedErrorRef.current) {
          hasLoggedErrorRef.current = true;
          console.warn("[쇼츠 폴링] 상태 조회 실패:", error);
        }
      }
    }, 3000);

    return () => {
      clearInterval(intervalId);
      prevCountRef.current = 0;
    };
  }, [isPolling, updateShortsFromServer, addNotification, stopPolling]);
};
