/**
 * Stream 엔티티 zod 스키마 (LiveKit 스트림 세션)
 */
import { z } from "zod";

export const StreamJoinRequestSchema = z.object({
  studioId: z.number(),
  participantName: z.string().min(1, "참가자 이름은 필수입니다"),
  metadata: z.string().optional(),
});
export type StreamJoinRequest = z.infer<typeof StreamJoinRequestSchema>;

export const StreamTokenResponseSchema = z.object({
  token: z.string(),
  roomName: z.string(),
  participantIdentity: z.string(),
  livekitUrl: z.string(),
});
export type StreamTokenResponse = z.infer<typeof StreamTokenResponseSchema>;

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
export type StreamSessionResponse = z.infer<typeof StreamSessionResponseSchema>;

export const ApiResponseStreamSessionSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: StreamSessionResponseSchema,
});
