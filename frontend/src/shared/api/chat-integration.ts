/**
 * 채팅 연동 API
 * 외부 플랫폼(YouTube, Twitch, Chzzk) 채팅 연동 시작/중지
 */
import { apiClient } from "./client";
import { z } from "zod";

const CHAT_INTEGRATION_BASE = "/api/media/chat/integration";

// 응답 스키마
const ApiResponseVoidSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

const YouTubeAutoStartResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    liveChatId: z.string(),
    message: z.string(),
  }).optional(),
});

export interface YouTubeIntegrationRequest {
  accessToken: string;
  refreshToken?: string;
  liveChatId?: string;
}

export interface TwitchIntegrationRequest {
  accessToken: string;
  channelName: string;
  channelId: string;
}

export interface ChzzkIntegrationRequest {
  channelId: string;
}

/**
 * YouTube 채팅 연동 시작 (자동으로 liveChatId 조회)
 */
export async function startYouTubeChatIntegration(
  studioId: number,
  request: { accessToken: string; refreshToken?: string }
): Promise<{ liveChatId: string; message: string } | null> {
  try {
    const res = await apiClient.post(
      `${CHAT_INTEGRATION_BASE}/${studioId}/youtube/auto-start`,
      YouTubeAutoStartResponseSchema,
      request
    );
    return res.data ?? null;
  } catch (error) {
    console.error("YouTube 채팅 연동 시작 실패:", error);
    return null;
  }
}

/**
 * YouTube 채팅 연동 시작 (liveChatId 직접 지정)
 */
export async function startYouTubeChatIntegrationManual(
  studioId: number,
  request: YouTubeIntegrationRequest
): Promise<boolean> {
  try {
    await apiClient.post(
      `${CHAT_INTEGRATION_BASE}/${studioId}/youtube/start`,
      ApiResponseVoidSchema,
      request
    );
    return true;
  } catch (error) {
    console.error("YouTube 채팅 연동 시작 실패:", error);
    return false;
  }
}

/**
 * Twitch 채팅 연동 시작
 */
export async function startTwitchChatIntegration(
  studioId: number,
  request: TwitchIntegrationRequest
): Promise<boolean> {
  try {
    await apiClient.post(
      `${CHAT_INTEGRATION_BASE}/${studioId}/twitch/start`,
      ApiResponseVoidSchema,
      request
    );
    return true;
  } catch (error) {
    console.error("Twitch 채팅 연동 시작 실패:", error);
    return false;
  }
}

/**
 * Chzzk 채팅 연동 시작
 */
export async function startChzzkChatIntegration(
  studioId: number,
  request: ChzzkIntegrationRequest
): Promise<boolean> {
  try {
    await apiClient.post(
      `${CHAT_INTEGRATION_BASE}/${studioId}/chzzk/start`,
      ApiResponseVoidSchema,
      request
    );
    return true;
  } catch (error) {
    console.error("Chzzk 채팅 연동 시작 실패:", error);
    return false;
  }
}

/**
 * 특정 플랫폼 채팅 연동 종료
 */
export async function stopChatIntegration(
  studioId: number,
  platform: "YOUTUBE" | "TWITCH" | "CHZZK"
): Promise<boolean> {
  try {
    await apiClient.post(
      `${CHAT_INTEGRATION_BASE}/${studioId}/${platform}/stop`,
      ApiResponseVoidSchema
    );
    return true;
  } catch (error) {
    console.error(`${platform} 채팅 연동 종료 실패:`, error);
    return false;
  }
}

/**
 * 모든 채팅 연동 종료
 */
export async function stopAllChatIntegrations(studioId: number): Promise<boolean> {
  try {
    await apiClient.post(
      `${CHAT_INTEGRATION_BASE}/${studioId}/stop-all`,
      ApiResponseVoidSchema
    );
    return true;
  } catch (error) {
    console.error("채팅 연동 종료 실패:", error);
    return false;
  }
}

// ==================== 자동 연동 API ====================

const ChatIntegrationResultSchema = z.object({
  platform: z.string(),
  success: z.boolean(),
  message: z.string(),
});

const ChatIntegrationResultsSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.array(ChatIntegrationResultSchema).optional(),
});

export interface ChatIntegrationResult {
  platform: string;
  success: boolean;
  message: string;
}

/**
 * 선택된 destination들에 대해 채팅 연동 자동 시작
 *
 * 백엔드에서 destination 정보를 조회하여 자동으로 연동
 */
export async function startChatIntegrationByDestinations(
  studioId: number,
  destinationIds: number[]
): Promise<ChatIntegrationResult[]> {
  try {
    const res = await apiClient.post(
      `/api/media/chat/integration/auto/${studioId}/destinations`,
      ChatIntegrationResultsSchema,
      { destinationIds }
    );
    return res.data ?? [];
  } catch (error) {
    console.error("채팅 연동 시작 실패:", error);
    return [];
  }
}
