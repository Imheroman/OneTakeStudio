/**
 * Video 엔티티 모델 export
 */
// 타입 export (zod 스키마에서 추론)
export type {
  Video,
  VideoStatus,
  VideoType,
  VideoListResponse,
  Clip,
  VideoDetail,
  CreateClipRequest,
  ShortsStatus,
  ShortsStatusResponse,
} from "./schemas";

// 스키마 export
export {
  VideoSchema,
  VideoListDataSchema,
  VideoListApiResponseSchema,
  ClipSchema,
  VideoDetailDataSchema,
  VideoDetailApiResponseSchema,
  CreateClipRequestSchema,
  CreateClipApiResponseSchema,
  ShortsStatusSchema,
  ShortsStatusResponseSchema,
} from "./schemas";
