/**
 * 스튜디오 노트 API (백엔드 구현 시 연동)
 * 예상 경로: GET/PUT /api/studios/{studioId}/note
 */
import { z } from "zod";
import { apiClient } from "./client";

const NoteResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
  data: z.object({ content: z.string() }).optional(),
  content: z.string().optional(),
});

export async function getStudioNote(
  studioId: string | number,
): Promise<string> {
  try {
    const res = await apiClient.get(
      `/api/studios/${studioId}/note`,
      NoteResponseSchema,
    );
    return (
      (res as { data?: { content?: string }; content?: string }).data
        ?.content ??
      (res as { content?: string }).content ??
      ""
    );
  } catch {
    return "";
  }
}

export async function putStudioNote(
  studioId: string | number,
  content: string,
): Promise<void> {
  await apiClient.put(
    `/api/studios/${studioId}/note`,
    z.object({
      success: z.boolean().optional(),
      message: z.string().optional(),
    }),
    { content },
  );
}
