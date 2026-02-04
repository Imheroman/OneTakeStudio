/**
 * 스튜디오 스트림 API 전용 DTO (LiveKit, Gateway: /api/streams/**)
 * FSD: shared/api는 entities 미참조.
 */
import { z } from "zod";

export const StreamJoinRequestSchema = z.object({
  studioId: z.number(),
  participantName: z.string().min(1, "참가자 이름은 필수입니다"),
  metadata: z.string().optional(),
});

export const StreamTokenResponseSchema = z.object({
  token: z.string(),
  roomName: z.string(),
  participantIdentity: z.string(),
  livekitUrl: z.string(),
});

export const ApiResponseStreamTokenSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: StreamTokenResponseSchema,
});

export const StreamSessionResponseSchema = z.object({
  sessionId: z.string(),
  studioId: z.number(),
  userId: z.number(),
  roomName: z.string(),
  participantIdentity: z.string(),
  status: z.enum(["CONNECTING", "ACTIVE", "DISCONNECTED", "CLOSED"]),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
});

export const ApiResponseStreamSessionSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: StreamSessionResponseSchema,
});

export type StreamJoinRequestDto = z.infer<typeof StreamJoinRequestSchema>;
export type StreamTokenResponseDto = z.infer<typeof StreamTokenResponseSchema>;
export type StreamSessionResponseDto = z.infer<typeof StreamSessionResponseSchema>;
