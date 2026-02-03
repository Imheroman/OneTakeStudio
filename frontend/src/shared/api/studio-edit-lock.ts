/**
 * 스튜디오 편집 락 API
 */
import { z } from "zod";
import { apiClient } from "./client";

// 편집 락 응답 스키마
const EditLockResponseSchema = z.object({
  locked: z.boolean(),
  lockedByUserId: z.string().nullable().optional(),
  lockedByNickname: z.string().nullable().optional(),
  acquiredAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isMyLock: z.boolean(),
});

const ApiResponseEditLockSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: EditLockResponseSchema.optional(),
});

export type EditLockResponse = z.infer<typeof EditLockResponseSchema>;

/**
 * 편집 락 획득
 */
export async function acquireEditLock(studioId: number): Promise<EditLockResponse> {
  const response = await apiClient.post(
    `/api/studios/${studioId}/edit-lock`,
    ApiResponseEditLockSchema,
    {}
  );
  return response.data ?? { locked: false, isMyLock: false };
}

/**
 * 편집 락 갱신 (heartbeat)
 */
export async function extendEditLock(studioId: number): Promise<EditLockResponse> {
  const response = await apiClient.post(
    `/api/studios/${studioId}/edit-lock`,
    ApiResponseEditLockSchema,
    { extend: true }
  );
  return response.data ?? { locked: false, isMyLock: false };
}

/**
 * 편집 락 해제
 */
export async function releaseEditLock(studioId: number): Promise<void> {
  await apiClient.delete(
    `/api/studios/${studioId}/edit-lock`,
    z.object({ success: z.boolean(), message: z.string().optional() })
  );
}

/**
 * 편집 락 상태 조회
 */
export async function getEditLockStatus(studioId: number): Promise<EditLockResponse> {
  const response = await apiClient.get(
    `/api/studios/${studioId}/edit-lock`,
    ApiResponseEditLockSchema
  );
  return response.data ?? { locked: false, isMyLock: false };
}

/**
 * 편집 락 강제 해제 (호스트 전용)
 */
export async function forceReleaseEditLock(studioId: number): Promise<void> {
  await apiClient.delete(
    `/api/studios/${studioId}/edit-lock/force`,
    z.object({ success: z.boolean(), message: z.string().optional() })
  );
}
