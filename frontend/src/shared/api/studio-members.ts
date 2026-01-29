/**
 * 스튜디오 멤버 API
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
  success: z.boolean(),
  message: z.string().optional(),
  data: z.array(StudioMemberResponseSchema),
});

const ApiResponseInviteSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: InviteResponseSchema,
});

export async function getStudioMembers(
  studioId: string | number,
): Promise<StudioMemberResponse[]> {
  const res = await apiClient.get(
    `/api/studios/${studioId}/members`,
    ApiResponseMembersSchema,
  );
  return res.data;
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
  role: "ADMIN" | "MEMBER",
): Promise<StudioMemberResponse> {
  const ApiResponseMemberSchema = z.object({
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
