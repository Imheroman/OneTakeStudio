/**
 * Studio 엔티티 모델 export
 */
// 타입 export (zod 스키마에서 추론)
export type {
  Studio,
  StudioDetail,
  RecentStudio,
  RecentStudioListResponse,
  TransmissionType,
  StorageLocation,
  Platform,
  LayoutType,
  Scene,
  Source,
  SourceType,
  CreateStudioRequest,
  CreateStudioResponse,
  SceneResponse,
  CreateSceneRequest,
  UpdateSceneRequest,
} from "./schemas";

// 스키마 export
export {
  StudioSchema,
  StudioDetailSchema,
  RecentStudioSchema,
  RecentStudioListResponseSchema,
  CreateStudioRequestSchema,
  CreateStudioResponseSchema,
  SceneSchema,
  SceneResponseSchema,
  CreateSceneRequestSchema,
  UpdateSceneRequestSchema,
  SourceSchema,
  TransmissionTypeSchema,
  StorageLocationSchema,
  PlatformSchema,
  LayoutTypeSchema,
  SourceTypeSchema,
} from "./schemas";
