/**
 * Recording 엔티티 모델 export
 * FSD Phase 2: API 타입·스키마는 shared DTO 재사용
 */
export type {
  RecordingStatusDto as RecordingStatus,
  RecordingResponseDto as RecordingResponse,
  RecordingStartRequestDto as RecordingStartRequest,
} from "@/shared/api/dto/recording";

export {
  RecordingStatusSchema,
  RecordingResponseSchema,
  RecordingStartRequestSchema,
  ApiResponseRecordingSchema,
  ApiResponseRecordingNullableSchema,
  ApiResponseRecordingArraySchema,
} from "@/shared/api/dto/recording";
