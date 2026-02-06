/**
 * 워크스페이스 API — GET /api/workspace/dashboard
 * 백엔드 ApiResponse 형식. FSD: shared는 entities에 의존하지 않도록 로컬 스키마 사용.
 */
import { z } from "zod";
import { apiClient } from "./client";

const RecentStudioItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
});

const ApiResponseDashboardSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    recentStudios: z.array(RecentStudioItemSchema),
    connectedDestinationCount: z.number(),
    totalStudioCount: z.number(),
  }),
});

export type RecentStudioItem = z.infer<typeof RecentStudioItemSchema>;

export type DashboardData = {
  recentStudios: RecentStudioItem[];
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
