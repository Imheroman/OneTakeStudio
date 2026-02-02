/**
 * 스튜디오 멤버 API
 * 백엔드 ApiResponse<T> 형식: { resultCode?, success, message?, data }
 */
import { z } from "zod";
import { apiClient } from "./client";
import {
  StudioMemberResponseSchema,
  InviteResponseSchema,
  type StudioMemberResponse,
  type InviteMemberRequest,
  type InviteResponse,
} from "@/entities/studio/model";

const ApiResponseMembersSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: z.array(StudioMemberResponseSchema),
});

const ApiResponseInviteSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: InviteResponseSchema,
});

const ApiResponseInviteListSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: z.array(InviteResponseSchema),
});

export async function getStudioMembers(
  studioId: string | number,
): Promise<StudioMemberResponse[]> {
  const res = await apiClient.get(
    `/api/studios/${studioId}/members`,
    ApiResponseMembersSchema,
  );
  return Array.isArray(res.data) ? res.data : [];
}

export async function inviteStudioMember(
  studioId: string | number,
  body: InviteMemberRequest,
): Promise<InviteResponse> {
  const res = await apiClient.post(
    `/api/studios/${studioId}/members/invite`,
    ApiResponseInviteSchema,
    body,
  );
  return res.data;
}

export async function kickStudioMember(
  studioId: string | number,
  memberId: number,
): Promise<void> {
  await apiClient.post(
    `/api/studios/${studioId}/members/${memberId}/kick`,
    z.object({ success: z.boolean(), message: z.string().optional() }),
  );
}

export async function updateMemberRole(
  studioId: string | number,
  memberId: number,
  role: "MANAGER" | "GUEST",
): Promise<StudioMemberResponse> {
  const ApiResponseMemberSchema = z.object({
    resultCode: z.string().optional(),
    success: z.boolean(),
    message: z.string().optional(),
    data: StudioMemberResponseSchema,
  });
  const res = await apiClient.patch(
    `/api/studios/${studioId}/members/${memberId}`,
    ApiResponseMemberSchema,
    { role },
  );
  return res.data;
}

/** 스튜디오 초대 대기 목록 — GET /api/studios/{studioId}/invites */
export async function getStudioInvites(
  studioId: string | number,
): Promise<InviteResponse[]> {
  try {
    const res = await apiClient.get(
      `/api/studios/${studioId}/invites`,
      ApiResponseInviteListSchema,
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (error: unknown) {
    // 403 에러는 GUEST 권한으로 조회 불가 - 빈 배열 반환 (정상 동작)
    const axiosError = error as { response?: { status?: number } };
    if (axiosError?.response?.status === 403) {
      return [];
    }
    throw error;
  }
}

/** 초대 취소 — DELETE /api/studios/{studioId}/invites/{inviteId} */
export async function cancelStudioInvite(
  studioId: string | number,
  inviteId: string,
): Promise<void> {
  await apiClient.delete(
    `/api/studios/${studioId}/invites/${inviteId}`,
    z.object({
      resultCode: z.string().optional(),
      success: z.boolean(),
      message: z.string().optional(),
    }),
  );
}
