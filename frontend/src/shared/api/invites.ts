/**
 * 받은 초대 API — GET /api/invites/received, POST accept/reject
 * 백엔드 ApiResponse 형식
 */
import { z } from "zod";
import { apiClient } from "./client";

const ReceivedInviteResponseSchema = z.object({
  inviteId: z.string(),
  studioId: z.string(),
  studioName: z.string(),
  studioThumbnail: z.string().nullable().optional(),
  inviterNickname: z.string().nullable().optional(),
  inviterEmail: z.string().nullable().optional(),
  role: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
});

const ApiResponseReceivedInviteListSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: z.array(ReceivedInviteResponseSchema),
});

const ApiResponseMessageSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
});

export type ReceivedInvite = z.infer<typeof ReceivedInviteResponseSchema>;

/** 받은 초대 목록 — GET /api/invites/received */
export async function getReceivedInvites(): Promise<ReceivedInvite[]> {
  const res = await apiClient.get(
    "/api/invites/received",
    ApiResponseReceivedInviteListSchema,
  );
  return Array.isArray(res.data) ? res.data : [];
}

/** 초대 수락 — POST /api/invites/{inviteId}/accept */
export async function acceptInvite(inviteId: string): Promise<void> {
  await apiClient.post(
    `/api/invites/${inviteId}/accept`,
    ApiResponseMessageSchema,
    {},
  );
}

/** 초대 거절 — POST /api/invites/{inviteId}/reject */
export async function rejectInvite(inviteId: string): Promise<void> {
  await apiClient.post(
    `/api/invites/${inviteId}/reject`,
    ApiResponseMessageSchema,
    {},
  );
}
