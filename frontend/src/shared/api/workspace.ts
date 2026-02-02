/**
 * 워크스페이스 API — GET /api/workspace/dashboard, GET /api/workspace/{userId}/studios/recent
 * 백엔드 ApiResponse 형식
 */
import { z } from "zod";
import { apiClient } from "./client";
import { RecentStudioSchema } from "@/entities/studio/model";

const ApiResponseDashboardSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    recentStudios: z.array(RecentStudioSchema),
    connectedDestinationCount: z.number(),
    totalStudioCount: z.number(),
  }),
});

export type DashboardData = {
  recentStudios: z.infer<typeof RecentStudioSchema>[];
  connectedDestinationCount: number;
  totalStudioCount: number;
};

/** 대시보드 조회 — GET /api/workspace/dashboard (현재 사용자 기준) */
export async function getDashboard(): Promise<DashboardData> {
  const res = await apiClient.get(
    "/api/workspace/dashboard",
    ApiResponseDashboardSchema,
  );
  return res.data;
}
