/**
 * 채팅 API 전용 DTO
 * FSD: shared/api는 entities 미참조.
 */
import { z } from "zod";

export const ChatPlatformSchema = z.enum([
  "YOUTUBE",
  "TWITCH",
  "CHZZK",
  "INTERNAL",
  "HOST",
]);
export const ChatMessageTypeSchema = z.enum([
  "CHAT",
  "SUPER_CHAT",
  "SYSTEM",
  "JOIN",
  "LEAVE",
  "NOTICE",
]);

export const ChatMessageSchema = z.object({
  messageId: z.string(),
  studioId: z.number(),
  platform: ChatPlatformSchema,
  messageType: ChatMessageTypeSchema,
  userId: z.number().nullable().optional(),
  senderName: z.string(),
  senderProfileUrl: z.string().nullable().optional(),
  content: z.string(),
  donationAmount: z.number().nullable().optional(),
  donationCurrency: z.string().nullable().optional(),
  isHighlighted: z.boolean().optional(),
  createdAt: z.string(),
});

export const ChatSendRequestSchema = z.object({
  studioId: z.number(),
  content: z.string(),
  senderName: z.string(),
  platform: ChatPlatformSchema.optional(),
});

export const ApiResponseChatMessageSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: ChatMessageSchema,
});

export const ApiResponseChatMessageArraySchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
  data: z.array(ChatMessageSchema),
});

export type ChatPlatformDto = z.infer<typeof ChatPlatformSchema>;
export type ChatMessageTypeDto = z.infer<typeof ChatMessageTypeSchema>;
export type ChatMessageDto = z.infer<typeof ChatMessageSchema>;
export type ChatSendRequestDto = z.infer<typeof ChatSendRequestSchema>;
