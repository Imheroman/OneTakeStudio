import { useEffect, useRef } from "react";
import { useShortsStore } from "@/stores/useShortsStore";
import { apiClient } from "@/shared/api/client";
import { ShortsStatusResponseSchema } from "@/entities/video/model";

/** 쇼츠 API는 백엔드 미구현 → MSW 모킹 시에만 폴링/API 호출 */
const isShortsApiAvailable = () =>
  process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

export const useShortsPolling = () => {
  const { setShortsStatus, addNotification } = useShortsStore();
  const prevCountRef = useRef(0); // 이전 완료 개수 기억 (중복 알림 방지)
  const hasLoggedErrorRef = useRef(false); // 동일 에러 반복 로그 방지

  useEffect(() => {
    if (!isShortsApiAvailable()) return; // 쇼츠 API 미구현 시 폴링 비활성화 (오류 방지)

    // 1초마다 서버 상태 체크 (MSW가 /api/v1/shorts/status 응답)
    const intervalId = setInterval(async () => {
      try {
        const data = await apiClient.get(
          "/api/v1/shorts/status",
          ShortsStatusResponseSchema,
        );

        hasLoggedErrorRef.current = false; // 성공 시 다음 에러부터 다시 로그 가능

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
        // CORS/네트워크 등 동일 에러가 1초마다 반복되므로 한 번만 로그
        if (!hasLoggedErrorRef.current) {
          hasLoggedErrorRef.current = true;
          console.warn(
            "[쇼츠 폴링] 쇼츠 상태 API를 사용할 수 없습니다. (백엔드 미구현 시 정상)",
            error,
          );
        }
      }
    }, 1000); // 1초 간격

    return () => clearInterval(intervalId); // 컴포넌트 언마운트 시 중단
  }, [setShortsStatus, addNotification]);
};
