/**
 * 라이브러리(녹화·스토리지) API 전용 DTO
 * FSD: shared/api는 entities 미참조.
 */
import { z } from "zod";

// --- 녹화 목록 ---

export const RecordingStatusSchema = z.enum([
  "RECORDING",
  "PROCESSING",
  "READY",
  "DELETED",
  "FAILED",
]);

export const RecordingSchema = z.object({
  recordingId: z.string(),
  studioId: z.union([z.string(), z.number()]),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  status: RecordingStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PaginationInfoSchema = z.object({
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
});

export const RecordingListResponseSchema = z.object({
  recordings: z.array(RecordingSchema),
  pagination: PaginationInfoSchema,
});

export const ApiResponseRecordingListSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: RecordingListResponseSchema,
});

/** library.ts 호환용 별칭 */
export const ApiResponseDataSchema = ApiResponseRecordingListSchema;

export type RecordingStatusDto = z.infer<typeof RecordingStatusSchema>;
export type RecordingDto = z.infer<typeof RecordingSchema>;
export type PaginationInfoDto = z.infer<typeof PaginationInfoSchema>;

/** 라이브러리 목록용 비디오 아이템 (getRecordings 변환 결과) */
export type LibraryVideoStatusDto =
  | "Uploaded"
  | "Saved"
  | "Processing"
  | "Failed";

export interface LibraryVideoDto {
  id: string;
  title: string;
  date: string;
  duration: string;
  type: "original";
  status: LibraryVideoStatusDto;
  thumbnailUrl?: string;
}

// --- 녹화 상세·다운로드 ---

export const ApiResponseRecordingSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: RecordingSchema,
});

export const DownloadUrlResponseSchema = z.object({
  downloadUrl: z.string(),
  expiresIn: z.number().optional(),
});

export const ApiResponseDownloadUrlSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: DownloadUrlResponseSchema,
});

export type VideoDetailFromApiDto = {
  id: string;
  title: string;
  date: string;
  duration: string;
  description?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  clips?: Array<{
    id: string;
    title: string;
    duration?: string;
    url?: string | null;
    thumbnailUrl?: string | null;
    status?: string;
  }>;
};

// --- 스토리지 ---

export const StorageResponseSchema = z.object({
  usedBytes: z.number(),
  limitBytes: z.number(),
  usedPercentage: z.number().optional(),
  usedFormatted: z.string().optional(),
  limitFormatted: z.string().optional(),
  videoUsage: z.number().optional(),
  assetUsage: z.number().optional(),
  shortsUsage: z.number().optional(),
});

export const ApiResponseStorageSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: StorageResponseSchema,
});

export type StorageDataFromApiDto = {
  used: number;
  total: number;
  available?: number;
  videoUsage?: number;
  assetUsage?: number;
  shortsUsage?: number;
};
