/**
 * Recording 엔티티 zod 스키마 (백엔드 회신 기준)
 */
import { z } from "zod";

export const RecordingStatusSchema = z.enum([
  "RECORDING",
  "PAUSED",
  "COMPLETED",
  "FAILED",
]);

export const RecordingResponseSchema = z.object({
  recordingId: z.string(),
  studioId: z.number(),
  userId: z.number().optional(),
  status: RecordingStatusSchema,
  fileName: z.string().nullable().optional(),
  s3Url: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

export const RecordingStartRequestSchema = z.object({
  studioId: z.number(),
});

export const ApiResponseRecordingSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: RecordingResponseSchema,
});

/** active 조회 시 진행 중인 녹화가 없으면 data: null */
export const ApiResponseRecordingNullableSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: RecordingResponseSchema.nullable(),
});

export const ApiResponseRecordingArraySchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: z.array(RecordingResponseSchema),
});

export type RecordingStatus = z.infer<typeof RecordingStatusSchema>;
export type RecordingResponse = z.infer<typeof RecordingResponseSchema>;
export type RecordingStartRequest = z.infer<typeof RecordingStartRequestSchema>;
