/**
 * Video 엔티티 모델 export
 */
// 타입 export (zod 스키마에서 추론)
export type {
  Video,
  VideoStatus,
  VideoType,
  VideoListResponse,
} from "./schemas";

// 스키마 export
export {
  VideoSchema,
  VideoListResponseSchema,
} from "./schemas";
