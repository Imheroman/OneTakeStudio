/**
 * 스튜디오 CRUD API (생성은 useStudioCreation에서 사용)
 * DELETE /api/studios/{studioId}
 */
import { apiClient } from "./client";
import { SuccessResponseSchema } from "./schemas";

export async function deleteStudio(
  studioId: string | number
): Promise<void> {
  await apiClient.delete(
    `/api/studios/${studioId}`,
    SuccessResponseSchema
  );
}
