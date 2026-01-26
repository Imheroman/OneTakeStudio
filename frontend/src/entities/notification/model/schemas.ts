/**
 * Notification 엔티티 zod 스키마 정의
 */
import { z } from "zod";

// 알림 타입
export const NotificationTypeSchema = z.enum([
  "friend_request",
  "studio_invite",
  "ai_shorts",
  "file_deletion",
  "system",
]);

// 알림 스키마
export const NotificationSchema = z.object({
  id: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  time: z.string().optional(), // "방금 전", "5분 전" 등 (MSW에서 사용)
  createdAt: z.string().optional(), // 실제 API에서 사용
  read: z.boolean().optional(),
});

// 알림 목록 응답 스키마
export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
});

// 타입 추론
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationListResponse = z.infer<
  typeof NotificationListResponseSchema
>;
