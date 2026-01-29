/**
 * Chat 엔티티 zod 스키마 (백엔드 회신 기준)
 */
import { z } from "zod";

export const ChatPlatformSchema = z.enum([
  "YOUTUBE",
  "TWITCH",
  "CHZZK",
  "INTERNAL",
]);
export const ChatMessageTypeSchema = z.enum(["NORMAL", "DONATION", "SYSTEM"]);

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

export type ChatPlatform = z.infer<typeof ChatPlatformSchema>;
export type ChatMessageType = z.infer<typeof ChatMessageTypeSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatSendRequest = z.infer<typeof ChatSendRequestSchema>;
