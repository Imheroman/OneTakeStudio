/**
 * Video 엔티티 모델 export
 * FSD Phase 2: 라이브러리 목록용 Video·VideoStatus는 shared DTO 재사용
 */
export type {
  LibraryVideoDto as Video,
  LibraryVideoStatusDto as VideoStatus,
} from "@/shared/api/dto/library";

export type {
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
