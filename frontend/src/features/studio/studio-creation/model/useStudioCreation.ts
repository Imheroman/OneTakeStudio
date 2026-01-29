"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/shared/api/client";
import {
  CreateStudioRequestSchema,
  CreateStudioResponseSchema,
  type CreateStudioRequest,
} from "@/entities/studio/model";

type TransmissionType = "live" | "saved_video";
type StorageLocation = "local" | "cloud";
type Platform = "youtube" | "chzzk" | "twitch";

export function useStudioCreation(initialType: "live" | "recording") {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: {
    title: string;
    description?: string;
    transmissionType: TransmissionType;
    storageLocation: StorageLocation;
    platforms: Platform[];
  }) => {
    try {
      setIsSubmitting(true);

      const request: CreateStudioRequest = {
        name: data.title,
        template: initialType === "live" ? "live" : "recording",
      };

      const response = await apiClient.post(
        "/api/studios",
        CreateStudioResponseSchema,
        request,
      );

      router.push(`/studio/${response.data.studioId}`);
    } catch (error: unknown) {
      console.error("스튜디오 생성 실패:", error);
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      const status = err.response?.status;

      if (status === 400) {
        const errorMessage = err.response?.data?.message || "요청이 올바르지 않습니다.";
        alert(`스튜디오 생성 실패(400): ${errorMessage}\n\n스튜디오 이름을 확인해주세요.`);
        return;
      }

      if (status === 503) {
        alert(
          "스튜디오 생성 실패(503): API Gateway(60000)가 core-service로 라우팅하지 못했습니다.\n" +
            "- Eureka에 core-service가 등록(UP)인지 확인\n" +
            "- 실행 순서: Eureka → core-service → api-gateway\n" +
            "- 모킹으로 우회하려면 NEXT_PUBLIC_API_MOCKING=enabled 후 프론트 dev 서버 재시작",
        );
        return;
      }

      if (status === 500) {
        const errorMessage = err.response?.data?.message || "서버 오류가 발생했습니다.";
        alert(`스튜디오 생성 실패(500): ${errorMessage}\n\n백엔드 로그를 확인해주세요.`);
        return;
      }

      alert(err.response?.data?.message || "스튜디오 생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting };
}
