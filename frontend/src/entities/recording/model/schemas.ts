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
export type RecordingStatus = z.infer<typeof RecordingStatusSchema>;

export const RecordingResponseSchema = z.object({
  recordingId: z.string(),
  studioId: z.number(),
  userId: z.number(),
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
export type RecordingResponse = z.infer<typeof RecordingResponseSchema>;

export const RecordingStartRequestSchema = z.object({
  studioId: z.number(),
  outputFormat: z.string().optional(),
  quality: z.string().optional(),
  audioOnly: z.boolean().optional(),
});
export type RecordingStartRequest = z.infer<typeof RecordingStartRequestSchema>;

export const ApiResponseRecordingSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: RecordingResponseSchema,
});

export const ApiResponseRecordingListSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.array(RecordingResponseSchema),
});
