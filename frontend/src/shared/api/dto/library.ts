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
  studioId: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  s3Url: z.string().nullable().optional(),
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

/** 백엔드 StorageController GET /api/storage 직접 응답 (ApiResponse 래퍼 없음) */
export const StorageResponseDirectSchema = z.object({
  total: z.number(),
  used: z.number(),
  available: z.number().optional(),
  videoUsage: z.number().optional(),
  assetUsage: z.number().optional(),
  usedBytes: z.number().optional(),
  limitBytes: z.number().optional(),
  usedPercentage: z.number().optional(),
  usedFormatted: z.string().optional(),
  limitFormatted: z.string().optional(),
});

/** 백엔드 StorageController GET /api/storage/files 직접 응답 (ApiResponse 래퍼 없음) */
export const StorageFileItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  uploadedAt: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  sizeBytes: z.number().nullable().optional(),
  type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
});

export const StorageFilesResponseDirectSchema = z.object({
  files: z.array(StorageFileItemSchema),
  totalPages: z.number(),
  totalElements: z.number(),
  currentPage: z.number(),
});

export const StorageResponseSchema = z.object({
  usedBytes: z.number(),
  limitBytes: z.number(),
  usedPercentage: z.number().optional(),
  usedFormatted: z.string().optional(),
  limitFormatted: z.string().optional(),
  videoCount: z.number().optional(),
  videoLimit: z.number().optional(),
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
};

export const StorageFileDtoSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  uploadedAt: z.string().nullable().optional(),
  size: z.union([z.string(), z.number()]).nullable().optional(),
  sizeBytes: z.number().nullable().optional(),
  type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  daysUntilDeletion: z.number().nullable().optional(),
});

export const StorageFilesResponseDtoSchema = z.object({
  files: z.array(StorageFileDtoSchema),
  totalPages: z.number().optional(),
  totalElements: z.number().optional(),
  currentPage: z.number().optional(),
});

export const ApiResponseStorageFilesSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: StorageFilesResponseDtoSchema,
});

export type StorageFileDto = z.infer<typeof StorageFileDtoSchema>;
export type StorageFileItemDto = z.infer<typeof StorageFileItemSchema>;

// --- 시간대별 댓글 분석 ---

export const CommentAnalysisBucketSchema = z.object({
  timeSec: z.number(),
  count: z.number(),
});

export const CommentAnalysisResponseSchema = z.object({
  recordingId: z.string(),
  durationSeconds: z.number(),
  buckets: z.array(CommentAnalysisBucketSchema),
});

export const ApiResponseCommentAnalysisSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: CommentAnalysisResponseSchema,
});

export type CommentAnalysisBucketDto = z.infer<
  typeof CommentAnalysisBucketSchema
>;
export type CommentAnalysisResponseDto = z.infer<
  typeof CommentAnalysisResponseSchema
>;

// --- 북마크(마커) ---

export const MarkerSchema = z.object({
  markerId: z.string(),
  recordingId: z.string(),
  timestampSec: z.number(),
  label: z.string().nullable().optional(),
});

export const MarkerListResponseSchema = z.object({
  markers: z.array(MarkerSchema),
});

export const ApiResponseMarkersSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: MarkerListResponseSchema,
});

export type MarkerDto = z.infer<typeof MarkerSchema>;
