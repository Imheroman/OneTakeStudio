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

      const request: CreateStudioRequest = {
        title: data.title,
        description: data.description,
        transmissionType: data.transmissionType,
        storageLocation: data.storageLocation,
        platforms: data.platforms,
      };

      const response = await apiClient.post(
        "/api/v1/studios",
        CreateStudioResponseSchema,
        request,
      );

      // 스튜디오 생성 성공 시 스튜디오 페이지로 이동
      router.push(`/studio/${response.studio.id}`);
    } catch (error: any) {
      console.error("스튜디오 생성 실패:", error);
      alert(
        error.response?.data?.message || "스튜디오 생성에 실패했습니다.",
      );
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
