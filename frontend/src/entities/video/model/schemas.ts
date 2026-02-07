/**
 * Video 엔티티 zod 스키마 정의
 * 백엔드: id = UUID 문자열, 응답 래퍼 { success, data }
 */
import { z } from "zod";

// 비디오 상태
export const VideoStatusSchema = z.enum([
  "Uploaded",
  "Saved",
  "Processing",
  "Failed",
]);

// 비디오 타입
export const VideoTypeSchema = z.enum(["original", "shorts"]);

// 비디오 스키마 (id = UUID 문자열)
export const VideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  duration: z.string(), // "42:18" 형식
  type: VideoTypeSchema,
  status: VideoStatusSchema,
  thumbnailUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  videoUrl: z.string().optional(),
});

// 비디오 목록 응답 (data 내부)
export const VideoListDataSchema = z.object({
  videos: z.array(VideoSchema),
  total: z.number(),
});

// 백엔드 ApiResponse 래퍼: { success, data }
export const VideoListApiResponseSchema = z.object({
  success: z.boolean(),
  data: VideoListDataSchema,
});

// 클립(쇼츠) 스키마 - 상세 페이지 사이드바용
export const ClipSchema = z.object({
  id: z.string(),
  title: z.string(),
  duration: z.string().optional(),
  url: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  status: z.string().optional(),
});

// 비디오 상세 응답 (data 내부)
export const VideoDetailDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  duration: z.string(),
  description: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  clips: z.array(ClipSchema).optional().default([]),
});

export const VideoDetailApiResponseSchema = z.object({
  success: z.boolean(),
  data: VideoDetailDataSchema,
});

// 클립 생성 요청 Body
export const CreateClipRequestSchema = z.object({
  recordingId: z.string(),
  title: z.string(),
  startTimeSec: z.number(),
  endTimeSec: z.number(),
});

// 클립 생성 응답 (data 내부)
export const CreateClipDataSchema = z.object({
  clipId: z.string().optional(),
  title: z.string().optional(),
  duration: z.number().optional(),
  status: z.string().optional(),
});

export const CreateClipApiResponseSchema = z.object({
  success: z.boolean(),
  data: CreateClipDataSchema.optional(),
  message: z.string().optional(),
});

// 쇼츠 생성 상태 스키마
export const ShortsStatusSchema = z.enum(["idle", "processing", "completed"]);

// 쇼츠 상태 응답 스키마
export const ShortsStatusResponseSchema = z.object({
  status: ShortsStatusSchema,
  completedCount: z.number(),
});

// 타입 추론
export type VideoStatus = z.infer<typeof VideoStatusSchema>;
export type VideoType = z.infer<typeof VideoTypeSchema>;
export type Video = z.infer<typeof VideoSchema>;
export type VideoListResponse = z.infer<typeof VideoListDataSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type VideoDetail = z.infer<typeof VideoDetailDataSchema>;
export type CreateClipRequest = z.infer<typeof CreateClipRequestSchema>;
export type ShortsStatus = z.infer<typeof ShortsStatusSchema>;
export type ShortsStatusResponse = z.infer<typeof ShortsStatusResponseSchema>;
