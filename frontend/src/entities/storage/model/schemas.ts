/**
 * Storage 엔티티 zod 스키마 정의
 */
import { z } from "zod";

// 스토리지 파일 스키마
export const StorageFileSchema = z.object({
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

// 스토리지 데이터 스키마 (백엔드 응답 호환)
export const StorageDataSchema = z.object({
  // GB 단위 (프론트엔드 UI용)
  total: z.number(),
  used: z.number(),
  available: z.number().optional(),
  videoUsage: z.number().optional(),
  assetUsage: z.number().optional(),
  videoCount: z.number().optional(),
  videoLimit: z.number().optional(),
  // bytes 단위 (상세 정보)
  usedBytes: z.number().optional(),
  limitBytes: z.number().optional(),
  usedPercentage: z.number().optional(),
  usedFormatted: z.string().optional(),
  limitFormatted: z.string().optional(),
});

// 스토리지 파일 목록 응답 스키마
export const StorageFilesResponseSchema = z.object({
  files: z.array(StorageFileSchema),
  totalPages: z.number().optional(),
  totalElements: z.number().optional(),
  currentPage: z.number().optional(),
});

// 타입 추론
export type StorageFile = z.infer<typeof StorageFileSchema>;
export type StorageData = z.infer<typeof StorageDataSchema>;
export type StorageFilesResponse = z.infer<typeof StorageFilesResponseSchema>;
