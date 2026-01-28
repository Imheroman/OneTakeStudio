import { useEffect, useRef } from "react";
import { useShortsStore } from "@/stores/useShortsStore";
import { apiClient } from "@/shared/api/client";
import { ShortsStatusResponseSchema } from "@/entities/video/model";

export const useShortsPolling = () => {
  const { setShortsStatus, addNotification } = useShortsStore();
  const prevCountRef = useRef(0); // 이전 완료 개수 기억 (중복 알림 방지)

  useEffect(() => {
    // 1초마다 서버 상태 체크 (Polling)
    const intervalId = setInterval(async () => {
      try {
        const data = await apiClient.get(
          "/api/v1/shorts/status",
          ShortsStatusResponseSchema,
        );

        // 생성 중이거나 완료되었을 때만 로직 수행
        if (data.status === "processing" || data.status === "completed") {
          // 상태 업데이트
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
        console.error("Polling error:", error);
      }
    }, 1000); // 1초 간격

    return () => clearInterval(intervalId); // 컴포넌트 언마운트 시 중단
  }, [setShortsStatus, addNotification]);
};
