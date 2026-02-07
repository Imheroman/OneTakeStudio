import { z } from "zod";
import { apiClient } from "./client";

const AuthorizeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    authUrl: z.string(),
  }),
});

const TokenStatusSchema = z.object({
  platform: z.string(),
  connected: z.boolean(),
  expired: z.boolean(),
  liveChatId: z.string().nullable(),
  channelId: z.string().nullable(),
});

const OAuthStatusResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.array(TokenStatusSchema),
});

export type TokenStatus = z.infer<typeof TokenStatusSchema>;

const RevokeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.null().optional(),
});

/**
 * YouTube OAuth 인증 URL 요청
 * GET /api/oauth/youtube/authorize?odUserId={odUserId}
 */
export async function getYouTubeAuthUrl(odUserId: string): Promise<string> {
  const response = await apiClient.get(
    `/api/oauth/youtube/authorize?odUserId=${encodeURIComponent(odUserId)}`,
    AuthorizeResponseSchema,
  );
  return response.data.authUrl;
}

/**
 * OAuth 연동 상태 조회
 * GET /api/oauth/status?odUserId={odUserId}
 */
export async function getOAuthStatus(odUserId: string): Promise<TokenStatus[]> {
  const response = await apiClient.get(
    `/api/oauth/status?odUserId=${encodeURIComponent(odUserId)}`,
    OAuthStatusResponseSchema,
  );
  return response.data;
}

/**
 * OAuth 연동 해제
 * DELETE /api/oauth/{platform}/revoke?odUserId={odUserId}
 */
export async function revokeOAuthToken(platform: string, odUserId: string): Promise<void> {
  await apiClient.delete(
    `/api/oauth/${platform}/revoke?odUserId=${encodeURIComponent(odUserId)}`,
    RevokeResponseSchema,
  );
}
