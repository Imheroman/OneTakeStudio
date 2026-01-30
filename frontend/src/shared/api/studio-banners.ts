/**
 * 스튜디오 배너 API (백엔드 구현 시 연동)
 * 예상 경로: GET/POST/DELETE /api/studios/{studioId}/banners
 */
import { z } from "zod";
import { apiClient } from "./client";

const BannerSchema = z.object({
  id: z.union([z.string(), z.number()]),
  studioId: z.number().optional(),
  text: z.string(),
  timerSeconds: z.number().nullable().optional(),
  isTicker: z.boolean().optional(),
  sortOrder: z.number().optional(),
  createdAt: z.string().optional(),
});

const ApiResponseBannerArraySchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.array(BannerSchema),
});

const ApiResponseBannerSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: BannerSchema,
});

export type BannerResponse = z.infer<typeof BannerSchema>;

export async function getStudioBanners(
  studioId: string | number,
): Promise<BannerResponse[]> {
  try {
    const res = await apiClient.get(
      `/api/studios/${studioId}/banners`,
      ApiResponseBannerArraySchema,
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function createStudioBanner(
  studioId: string | number,
  body: { text: string; timerSeconds?: number; isTicker?: boolean },
): Promise<BannerResponse | null> {
  try {
    const res = await apiClient.post(
      `/api/studios/${studioId}/banners`,
      ApiResponseBannerSchema,
      body,
    );
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function deleteStudioBanner(
  studioId: string | number,
  bannerId: string | number,
): Promise<void> {
  await apiClient.delete(
    `/api/studios/${studioId}/banners/${bannerId}`,
    z.object({ success: z.boolean(), message: z.string().optional() }),
  );
}
