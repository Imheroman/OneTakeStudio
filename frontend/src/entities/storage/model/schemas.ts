/**
 * Storage 엔티티 zod 스키마 정의
 */
import { z } from "zod";

// 스토리지 파일 스키마
export const StorageFileSchema = z.object({
  id: z.union([z.string(), z.number()]), // MSW에서는 number, 실제 API는 string일 수 있음
  title: z.string().optional(), // MSW에서는 title 사용
  name: z.string().optional(), // 실제 API에서는 name 사용
  date: z.string().optional(), // MSW에서는 date 사용
  uploadedAt: z.string().optional(), // 실제 API에서는 uploadedAt 사용
  size: z.union([z.string(), z.number()]).optional(), // MSW는 string, 실제는 number일 수 있음
  type: z.string().optional(),
  status: z.string().optional(), // MSW에서 사용
});

// 스토리지 데이터 스키마
export const StorageDataSchema = z.object({
  total: z.number(),
  used: z.number(),
  available: z.number().optional(),
  videoUsage: z.number().optional(),
  assetUsage: z.number().optional(),
});

// 스토리지 파일 목록 응답 스키마
export const StorageFilesResponseSchema = z.object({
  files: z.array(StorageFileSchema),
});

// 타입 추론
export type StorageFile = z.infer<typeof StorageFileSchema>;
export type StorageData = z.infer<typeof StorageDataSchema>;
export type StorageFilesResponse = z.infer<typeof StorageFilesResponseSchema>;
