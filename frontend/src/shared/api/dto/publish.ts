/**
 * 스튜디오 송출 API 전용 DTO (RTMP, Gateway: /api/publish/**)
 * FSD: shared/api는 entities 미참조.
 */
import { z } from "zod";

export const PublishStatusSchema = z.enum([
  "PENDING",
  "PUBLISHING",
  "STOPPED",
  "FAILED",
]);

export const PublishStartRequestSchema = z.object({
  studioId: z.union([z.string(), z.number()]),
  destinationIds: z.array(z.number()).min(1, "송출 채널은 최소 1개 이상이어야 합니다"),
  streamSessionId: z.string().optional(),
});

export const PublishResponseSchema = z.object({
  publishSessionId: z.string(),
  studioId: z.union([z.string(), z.number()]),
  status: PublishStatusSchema,
  destinationIds: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

export const ApiResponsePublishSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: PublishResponseSchema,
});

export const DestinationStatusSchema = z.object({
  destinationId: z.number(),
  platform: z.string(),
  status: z.string(),
  rtmpUrl: z.string().nullable().optional(),
});

export const PublishStatusResponseSchema = z.object({
  publishSessionId: z.string(),
  studioId: z.union([z.string(), z.number()]),
  status: PublishStatusSchema,
  destinations: z.array(DestinationStatusSchema),
  startedAt: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
});

export const ApiResponsePublishStatusSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: PublishStatusResponseSchema,
});

export type PublishStatusDto = z.infer<typeof PublishStatusSchema>;
export type PublishStartRequestDto = z.infer<typeof PublishStartRequestSchema>;
export type PublishResponseDto = z.infer<typeof PublishResponseSchema>;
export type PublishStatusResponseDto = z.infer<typeof PublishStatusResponseSchema>;
export type DestinationStatusDto = z.infer<typeof DestinationStatusSchema>;
