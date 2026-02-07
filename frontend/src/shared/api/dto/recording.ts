/**
 * 스튜디오 녹화 API 전용 DTO (Gateway: /api/recordings/**)
 * FSD: shared/api는 entities 미참조.
 */
import { z } from "zod";

export const RecordingStatusSchema = z.enum([
  "PENDING",
  "RECORDING",
  "PAUSED",
  "PROCESSING",
  "UPLOADING",
  "COMPLETED",
  "FAILED",
]);

export const RecordingResponseSchema = z.object({
  recordingId: z.string(),
  studioId: z.string(),
  userId: z.string().optional(),
  status: RecordingStatusSchema,
  fileName: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

export const RecordingStartRequestSchema = z.object({
  studioId: z.string(),
  outputFormat: z.string().optional(),
  quality: z.string().optional(),
  audioOnly: z.boolean().optional(),
});

export const ApiResponseRecordingSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: RecordingResponseSchema,
});

export const ApiResponseRecordingArraySchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: z.array(RecordingResponseSchema),
});

export const ApiResponseRecordingNullableSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: RecordingResponseSchema.nullable(),
});

export type RecordingStatusDto = z.infer<typeof RecordingStatusSchema>;
export type RecordingResponseDto = z.infer<typeof RecordingResponseSchema>;
export type RecordingStartRequestDto = z.infer<typeof RecordingStartRequestSchema>;
