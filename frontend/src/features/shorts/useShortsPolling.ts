import { useEffect, useRef } from "react";
import { useShortsStore } from "@/stores/useShortsStore";
import { apiClient } from "@/shared/api/client";
import { z } from "zod";

// AI 쇼츠 상태 응답 스키마
const ShortsStatusResponseSchema = z.object({
  jobId: z.string().optional(),
  status: z.string(),
  totalCount: z.number(),
  completedCount: z.number(),
  shorts: z.array(z.object({
    videoId: z.string().optional(),
    status: z.string(),
    outputPath: z.string().nullable().optional(),
    thumbnailPath: z.string().nullable().optional(),
    processingTimeSec: z.number().nullable().optional(),
    error: z.string().nullable().optional(),
  })).optional(),
});

export const useShortsPolling = () => {
  const { setShortsStatus, addNotification } = useShortsStore();
  const prevCountRef = useRef(0);
  const hasLoggedErrorRef = useRef(false);
  const isPollingRef = useRef(false);

  useEffect(() => {
    // 3초마다 서버 상태 체크
    const intervalId = setInterval(async () => {
      // 이미 폴링 중이면 스킵
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        const response = await apiClient.get(
          "/api/ai/shorts/status",
          z.object({
            success: z.boolean(),
            data: ShortsStatusResponseSchema,
          }),
        );

        const data = response.data;
        hasLoggedErrorRef.current = false;

        // idle 상태면 폴링 불필요
        if (data.status === "idle") {
          prevCountRef.current = 0;
          isPollingRef.current = false;
          return;
        }

        // 생성 중이거나 완료되었을 때만 로직 수행
        if (data.status === "processing" || data.status === "completed") {
          setShortsStatus(data.completedCount);

          // 새로운 완료 건수가 있을 때만 알림 추가
          if (data.completedCount > prevCountRef.current) {
            addNotification(
              `🔔 ${data.completedCount}번째 쇼츠 생성이 완료되었습니다!`,
            );
            prevCountRef.current = data.completedCount;
          }
        }
      } catch (error) {
        if (!hasLoggedErrorRef.current) {
          hasLoggedErrorRef.current = true;
          console.warn("[쇼츠 폴링] 상태 조회 실패:", error);
        }
      } finally {
        isPollingRef.current = false;
      }
    }, 3000); // 3초 간격

    return () => clearInterval(intervalId);
  }, [setShortsStatus, addNotification]);
};
