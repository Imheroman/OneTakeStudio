/**
 * 스튜디오 채팅 API (경로: /api/media/chat)
 * FSD: shared는 entities 미참조. dto/chat 사용.
 */
import { apiClient } from "./client";
import {
  ApiResponseChatMessageArraySchema,
  ApiResponseChatMessageSchema,
  type ChatMessageDto,
  type ChatSendRequestDto,
} from "./dto/chat";

const CHAT_BASE = "/api/media/chat";

export async function getChatHistory(
  studioId: string | number,
  limit = 100,
): Promise<ChatMessageDto[]> {
  const res = await apiClient.get(
    `${CHAT_BASE}/${studioId}?limit=${limit}`,
    ApiResponseChatMessageArraySchema,
  );
  return res.data;
}

export async function sendChatMessage(
  body: ChatSendRequestDto,
): Promise<ChatMessageDto> {
  const res = await apiClient.post(
    CHAT_BASE,
    ApiResponseChatMessageSchema,
    body,
  );
  return res.data;
}
