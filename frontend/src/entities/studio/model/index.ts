/**
 * Studio 엔티티 모델 export
 * FSD Phase 2: 멤버·초대 타입은 shared DTO 재사용
 */
export type {
  StudioMemberResponseDto as StudioMemberResponse,
  InviteMemberRequestDto as InviteMemberRequest,
  InviteResponseDto as InviteResponse,
} from "@/shared/api/dto/studio";

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
  SourceFit,
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
  SourceFitSchema,
  TransmissionTypeSchema,
  StorageLocationSchema,
  PlatformSchema,
  LayoutTypeSchema,
  SourceTypeSchema,
} from "./schemas";

export {
  StudioMemberResponseSchema,
  InviteMemberRequestSchema,
  InviteResponseSchema,
} from "@/shared/api/dto/studio";
