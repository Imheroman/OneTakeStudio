/**
 * Chat 엔티티 모델 export
 * FSD Phase 2: API 타입·스키마는 shared DTO 재사용
 */
export type {
  ChatPlatformDto as ChatPlatform,
  ChatMessageTypeDto as ChatMessageType,
  ChatMessageDto as ChatMessage,
  ChatSendRequestDto as ChatSendRequest,
} from "@/shared/api/dto/chat";

export {
  ChatPlatformSchema,
  ChatMessageTypeSchema,
  ChatMessageSchema,
  ChatSendRequestSchema,
  ApiResponseChatMessageSchema,
  ApiResponseChatMessageArraySchema,
} from "@/shared/api/dto/chat";
