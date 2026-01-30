/**
 * Publish 엔티티 zod 스키마 (RTMP 송출)
 */
import { z } from "zod";

export const PublishStatusSchema = z.enum([
  "PENDING",
  "PUBLISHING",
  "STOPPED",
  "FAILED",
]);
export type PublishStatus = z.infer<typeof PublishStatusSchema>;

export const PublishStartRequestSchema = z.object({
  studioId: z.number(),
  destinationIds: z.array(z.number()).min(1, "송출 채널은 최소 1개 이상이어야 합니다"),
  streamSessionId: z.string().optional(),
});
export type PublishStartRequest = z.infer<typeof PublishStartRequestSchema>;

export const PublishResponseSchema = z.object({
  publishSessionId: z.string(),
  studioId: z.number(),
  status: PublishStatusSchema,
  destinationIds: z.string().nullable().optional(), // JSON array string
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});
export type PublishResponse = z.infer<typeof PublishResponseSchema>;

export const ApiResponsePublishSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: PublishResponseSchema,
});

export const DestinationStatusSchema = z.object({
  destinationId: z.number(),
  platform: z.string(),
  status: z.string(), // connected, disconnected, error
  rtmpUrl: z.string().nullable().optional(),
});
export type DestinationStatus = z.infer<typeof DestinationStatusSchema>;

export const PublishStatusResponseSchema = z.object({
  publishSessionId: z.string(),
  studioId: z.number(),
  status: PublishStatusSchema,
  destinations: z.array(DestinationStatusSchema),
  startedAt: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
});
export type PublishStatusResponse = z.infer<typeof PublishStatusResponseSchema>;

export const ApiResponsePublishStatusSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: PublishStatusResponseSchema,
});
