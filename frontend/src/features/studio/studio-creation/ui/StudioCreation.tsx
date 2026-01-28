"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateStudioDialog } from "@/widgets/studio/create-studio-dialog";
import { apiClient } from "@/shared/api/client";
import {
  CreateStudioRequestSchema,
  CreateStudioResponseSchema,
  type CreateStudioRequest,
} from "@/entities/studio/model";

interface StudioCreationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: "live" | "recording";
}

export function StudioCreation({
  open,
  onOpenChange,
  initialType = "live",
}: StudioCreationProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: {
    title: string;
    description?: string;
    transmissionType: "live" | "saved_video";
    storageLocation: "local" | "cloud";
    platforms: ("youtube" | "chzzk" | "twitch")[];
  }) => {
    try {
      setIsSubmitting(true);

      // 백엔드 API 스펙에 맞게 변환 (name, template만 전송)
      const request: CreateStudioRequest = {
        name: data.title, // title을 name으로 매핑
        template: initialType === "live" ? "live" : "recording", // initialType을 template으로 변환
      };

      const response = await apiClient.post(
        "/api/studios",
        CreateStudioResponseSchema,
        request,
      );

      // 스튜디오 생성 성공 시 스튜디오 페이지로 이동
      router.push(`/studio/${response.data.studioId}`);
    } catch (error: any) {
      console.error("스튜디오 생성 실패:", error);
      const status = error?.response?.status;
      
      if (status === 400) {
        // IllegalArgumentException이 이제 400으로 반환됨
        const errorMessage = error.response?.data?.message || error.message || "요청이 올바르지 않습니다.";
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
        const errorMessage = error.response?.data?.message || error.message || "서버 오류가 발생했습니다.";
        alert(`스튜디오 생성 실패(500): ${errorMessage}\n\n백엔드 로그를 확인해주세요.`);
        return;
      }

      alert(error.response?.data?.message || "스튜디오 생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CreateStudioDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      initialType={initialType}
    />
  );
}
