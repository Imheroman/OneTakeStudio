/**
 * 스튜디오 API 전용 DTO (멤버·초대 등)
 * FSD: shared/api는 entities 미참조.
 */
import { z } from "zod";

export const StudioMemberResponseSchema = z.object({
  memberId: z.number(),
  userId: z.number(),
  nickname: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  role: z.enum(["host", "manager", "guest"]),
  joinedAt: z.string().optional(),
});

export const InviteMemberRequestSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export const InviteResponseSchema = z.object({
  inviteId: z.string(),
  studioId: z.number().optional(),
  email: z.string().optional(),
  inviteeEmail: z.string().optional(),
  role: z.string(),
  status: z.string(),
  expiresAt: z.string(),
  createdAt: z.string().optional(),
});

export type StudioMemberResponseDto = z.infer<typeof StudioMemberResponseSchema>;
export type InviteMemberRequestDto = z.infer<typeof InviteMemberRequestSchema>;
export type InviteResponseDto = z.infer<typeof InviteResponseSchema>;
