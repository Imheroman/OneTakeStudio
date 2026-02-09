/**
 * Publish 엔티티 모델 export
 * FSD Phase 2: API 타입·스키마는 shared DTO 재사용
 */
export type {
  PublishStatusDto as PublishStatus,
  PublishStartRequestDto as PublishStartRequest,
  PublishResponseDto as PublishResponse,
  PublishStatusResponseDto as PublishStatusResponse,
  DestinationStatusDto as DestinationStatus,
} from "@/shared/api/dto/publish";

export {
  PublishStatusSchema,
  PublishStartRequestSchema,
  PublishResponseSchema,
  ApiResponsePublishSchema,
  PublishStatusResponseSchema,
  ApiResponsePublishStatusSchema,
  DestinationStatusSchema,
} from "@/shared/api/dto/publish";
