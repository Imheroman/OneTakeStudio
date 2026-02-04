/**
 * 스튜디오 에셋 API (백엔드 구현 시 연동)
 * 예상 경로: GET/POST/DELETE /api/studios/{studioId}/assets
 */
import { z } from "zod";
import { apiClient } from "./client";

const AssetSchema = z.object({
  id: z.union([z.string(), z.number()]),
  studioId: z.union([z.string(), z.number()]).optional(),
  type: z.enum(["logo", "overlay", "video"]),
  name: z.string(),
  fileUrl: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

const ApiResponseAssetArraySchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.array(AssetSchema),
});

const ApiResponseAssetSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: AssetSchema,
});

export type AssetResponse = z.infer<typeof AssetSchema>;

export async function getStudioAssets(
  studioId: string | number,
): Promise<AssetResponse[]> {
  try {
    const res = await apiClient.get(
      `/api/studios/${studioId}/assets`,
      ApiResponseAssetArraySchema,
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function createStudioAsset(
  studioId: string | number,
  body: { type: string; name: string; fileUrl?: string },
): Promise<AssetResponse | null> {
  try {
    const res = await apiClient.post(
      `/api/studios/${studioId}/assets`,
      ApiResponseAssetSchema,
      body,
    );
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function deleteStudioAsset(
  studioId: string | number,
  assetId: string | number,
): Promise<void> {
  await apiClient.delete(
    `/api/studios/${studioId}/assets/${assetId}`,
    z.object({ success: z.boolean(), message: z.string().optional() }),
  );
}
