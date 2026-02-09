/**
 * 스튜디오 멤버 API
 * FSD: shared는 entities 미참조. dto/studio 사용.
 */
import { z } from "zod";
import { apiClient } from "./client";
import {
  StudioMemberResponseSchema,
  InviteMemberRequestSchema,
  InviteResponseSchema,
  type StudioMemberResponseDto,
  type InviteMemberRequestDto,
  type InviteResponseDto,
} from "./dto/studio";

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
  studioId: string | number
): Promise<StudioMemberResponseDto[]> {
  const res = await apiClient.get(
    `/api/studios/${studioId}/members`,
    ApiResponseMembersSchema
  );
  return Array.isArray(res.data) ? res.data : [];
}

export async function inviteStudioMember(
  studioId: string | number,
  body: InviteMemberRequestDto
): Promise<InviteResponseDto> {
  const res = await apiClient.post(
    `/api/studios/${studioId}/members/invite`,
    ApiResponseInviteSchema,
    body
  );
  return res.data;
}

export async function kickStudioMember(
  studioId: string | number,
  memberId: number
): Promise<void> {
  await apiClient.post(
    `/api/studios/${studioId}/members/${memberId}/kick`,
    z.object({ success: z.boolean(), message: z.string().optional() })
  );
}

export async function updateMemberRole(
  studioId: string | number,
  memberId: number,
  role: "ADMIN" | "MEMBER" | "MANAGER"
): Promise<StudioMemberResponseDto> {
  const ApiResponseMemberSchema = z.object({
    resultCode: z.string().optional(),
    success: z.boolean(),
    message: z.string().optional(),
    data: StudioMemberResponseSchema,
  });
  const res = await apiClient.patch(
    `/api/studios/${studioId}/members/${memberId}`,
    ApiResponseMemberSchema,
    { role }
  );
  return res.data;
}

export async function getStudioInvites(
  studioId: string | number
): Promise<InviteResponseDto[]> {
  try {
    const res = await apiClient.get(
      `/api/studios/${studioId}/invites`,
      ApiResponseInviteListSchema
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch (error: unknown) {
    // 403 에러 시 빈 배열 반환 (정상 동작)
    const axiosError = error as { response?: { status?: number } };
    if (axiosError?.response?.status === 403) {
      return [];
    }
    throw error;
  }
}

export async function cancelStudioInvite(
  studioId: string | number,
  inviteId: string
): Promise<void> {
  await apiClient.delete(
    `/api/studios/${studioId}/invites/${inviteId}`,
    z.object({
      resultCode: z.string().optional(),
      success: z.boolean(),
      message: z.string().optional(),
    })
  );
}
