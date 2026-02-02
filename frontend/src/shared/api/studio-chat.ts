/**
 * 스튜디오 채팅 API (경로: /api/media/chat — V1 제외)
 */
import { apiClient } from "./client";
import {
  ApiResponseChatMessageArraySchema,
  ApiResponseChatMessageSchema,
  type ChatMessage,
  type ChatSendRequest,
} from "@/entities/chat/model";

const CHAT_BASE = "/api/media/chat";

export async function getChatHistory(
  studioId: number,
  limit = 100,
): Promise<ChatMessage[]> {
  const res = await apiClient.get(
    `${CHAT_BASE}/${studioId}?limit=${limit}`,
    ApiResponseChatMessageArraySchema,
  );
  return res.data;
}

export async function sendChatMessage(
  body: ChatSendRequest,
): Promise<ChatMessage> {
  const res = await apiClient.post(
    CHAT_BASE,
    ApiResponseChatMessageSchema,
    body,
  );
  return res.data;
}
