/**
 * Video 엔티티 zod 스키마 정의
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

// 비디오 스키마
export const VideoSchema = z.object({
  id: z.number(),
  title: z.string(),
  date: z.string(),
  duration: z.string(), // "42:18" 형식
  type: VideoTypeSchema,
  status: VideoStatusSchema,
  thumbnailUrl: z.string().url().optional(),
});

// 비디오 목록 응답 스키마
export const VideoListResponseSchema = z.object({
  videos: z.array(VideoSchema),
  total: z.number(),
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
export type VideoListResponse = z.infer<typeof VideoListResponseSchema>;
export type ShortsStatus = z.infer<typeof ShortsStatusSchema>;
export type ShortsStatusResponse = z.infer<typeof ShortsStatusResponseSchema>;
