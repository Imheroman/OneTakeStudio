/**
 * Stream 엔티티 모델 export
 * FSD Phase 2: API 타입·스키마는 shared DTO 재사용
 */
export type {
  StreamJoinRequestDto as StreamJoinRequest,
  StreamTokenResponseDto as StreamTokenResponse,
  StreamSessionResponseDto as StreamSessionResponse,
} from "@/shared/api/dto/stream";

export {
  StreamJoinRequestSchema,
  StreamTokenResponseSchema,
  ApiResponseStreamTokenSchema,
  StreamSessionResponseSchema,
  ApiResponseStreamSessionSchema,
} from "@/shared/api/dto/stream";
