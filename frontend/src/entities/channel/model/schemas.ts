/**
 * Channel 엔티티 zod 스키마 정의
 */
import { z } from "zod";

// 플랫폼 타입
export const PlatformTypeSchema = z.enum([
  "youtube",
  "twitch",
  "facebook",
  "custom_rtmp",
]);

// 채널 연결 상태
export const ChannelStatusSchema = z.enum(["connected", "disconnected"]);

// 채널 스키마
export const ChannelSchema = z.object({
  id: z.string(),
  platform: PlatformTypeSchema,
  accountName: z.string(),
  status: ChannelStatusSchema,
  connectedAt: z.string().optional(),
  disconnectedAt: z.string().optional(),
});

// 채널 목록 응답 스키마
export const ChannelListResponseSchema = z.object({
  channels: z.array(ChannelSchema),
  total: z.number(),
});

// 플랫폼 정보 스키마
export const PlatformInfoSchema = z.object({
  type: PlatformTypeSchema,
  name: z.string(),
  icon: z.string(),
  description: z.string().optional(),
});

// 채널 연결 요청 스키마
export const ConnectChannelRequestSchema = z.object({
  platform: PlatformTypeSchema,
});

// 채널 연결 응답 스키마
export const ConnectChannelResponseSchema = z.object({
  authUrl: z.string().url("올바른 URL 형식이 아닙니다."),
});

// OAuth 콜백 응답 스키마
export const OAuthCallbackResponseSchema = z.object({
  channel: ChannelSchema.optional(),
  message: z.string(),
  redirectUrl: z.string().url().optional(),
});

// 타입 추론
export type PlatformType = z.infer<typeof PlatformTypeSchema>;
export type ChannelStatus = z.infer<typeof ChannelStatusSchema>;
export type Channel = z.infer<typeof ChannelSchema>;
export type ChannelListResponse = z.infer<typeof ChannelListResponseSchema>;
export type PlatformInfo = z.infer<typeof PlatformInfoSchema>;
export type ConnectChannelRequest = z.infer<typeof ConnectChannelRequestSchema>;
export type ConnectChannelResponse = z.infer<
  typeof ConnectChannelResponseSchema
>;
export type OAuthCallbackResponse = z.infer<
  typeof OAuthCallbackResponseSchema
>;
