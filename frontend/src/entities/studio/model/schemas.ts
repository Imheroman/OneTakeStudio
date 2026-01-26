/**
 * Studio 엔티티 zod 스키마 정의
 */
import { z } from "zod";

// 송출 타입
export const TransmissionTypeSchema = z.enum(["live", "saved_video"]);

// 저장 위치
export const StorageLocationSchema = z.enum(["local", "cloud"]);

// 송출 플랫폼
export const PlatformSchema = z.enum(["youtube", "chzzk", "twitch"]);

// 레이아웃 타입
export const LayoutTypeSchema = z.enum([
  "full",
  "split",
  "three-grid",
  "four-grid",
  "custom",
]);

// 씬 스키마
export const SceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
});

// 소스 타입
export const SourceTypeSchema = z.enum([
  "video",
  "audio",
  "image",
  "text",
  "browser",
]);

// 소스 스키마
export const SourceSchema = z.object({
  id: z.string(),
  type: SourceTypeSchema,
  name: z.string(),
  isVisible: z.boolean(),
});

// 스튜디오 스키마
export const StudioSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  transmissionType: TransmissionTypeSchema,
  storageLocation: StorageLocationSchema,
  platforms: z.array(PlatformSchema),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

// 최근 스튜디오 스키마 (워크스페이스용 - id가 number, date 필드 포함)
export const RecentStudioSchema = z.object({
  id: z.number(),
  title: z.string(),
  date: z.string(),
});

// 스튜디오 목록 응답 스키마 (워크스페이스용)
export const RecentStudioListResponseSchema = z.object({
  studios: z.array(RecentStudioSchema),
});

// 스튜디오 생성 요청 스키마
export const CreateStudioRequestSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요."),
  description: z.string().optional(),
  transmissionType: TransmissionTypeSchema,
  storageLocation: StorageLocationSchema,
  platforms: z.array(PlatformSchema).min(1, "최소 1개 이상의 플랫폼을 선택해주세요."),
});

// 스튜디오 생성 응답 스키마
export const CreateStudioResponseSchema = z.object({
  studio: StudioSchema,
  message: z.string().optional(),
});

// 스튜디오 상세 정보 스키마
export const StudioDetailSchema = StudioSchema.extend({
  currentLayout: LayoutTypeSchema,
  scenes: z.array(SceneSchema),
  sources: z.array(SourceSchema),
  isLive: z.boolean(),
  elapsedTime: z.string().optional(),
});

// 타입 추론
export type TransmissionType = z.infer<typeof TransmissionTypeSchema>;
export type StorageLocation = z.infer<typeof StorageLocationSchema>;
export type Platform = z.infer<typeof PlatformSchema>;
export type LayoutType = z.infer<typeof LayoutTypeSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type SourceType = z.infer<typeof SourceTypeSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Studio = z.infer<typeof StudioSchema>;
export type RecentStudio = z.infer<typeof RecentStudioSchema>;
export type RecentStudioListResponse = z.infer<
  typeof RecentStudioListResponseSchema
>;
export type CreateStudioRequest = z.infer<typeof CreateStudioRequestSchema>;
export type CreateStudioResponse = z.infer<typeof CreateStudioResponseSchema>;
export type StudioDetail = z.infer<typeof StudioDetailSchema>;
