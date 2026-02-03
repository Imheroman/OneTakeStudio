/**
 * API 전용 DTO 모듈
 * FSD: shared/api는 entities 미참조. 응답·요청 스키마·타입만 정의.
 */
export {
  UserProfileDtoSchema,
  ApiResponseUserProfileSchema,
  type UserProfileDto,
} from "./user";

export {
  type LibraryVideoDto,
  type LibraryVideoStatusDto,
  type VideoDetailFromApiDto,
  type StorageDataFromApiDto,
  type PaginationInfoDto,
} from "./library";

export {
  StudioMemberResponseSchema,
  InviteMemberRequestSchema,
  InviteResponseSchema,
  type StudioMemberResponseDto,
  type InviteMemberRequestDto,
  type InviteResponseDto,
} from "./studio";

export {
  ChatMessageSchema,
  ChatSendRequestSchema,
  ApiResponseChatMessageSchema,
  ApiResponseChatMessageArraySchema,
  type ChatMessageDto,
  type ChatSendRequestDto,
} from "./chat";

export {
  ApiResponseRecordingSchema,
  ApiResponseRecordingArraySchema,
  ApiResponseRecordingNullableSchema,
  type RecordingResponseDto,
  type RecordingStartRequestDto,
  type RecordingStatusDto,
} from "./recording";

export {
  ApiResponseStreamTokenSchema,
  ApiResponseStreamSessionSchema,
  type StreamJoinRequestDto,
  type StreamTokenResponseDto,
  type StreamSessionResponseDto,
} from "./stream";

export {
  ApiResponsePublishSchema,
  ApiResponsePublishStatusSchema,
  type PublishStartRequestDto,
  type PublishResponseDto,
  type PublishStatusResponseDto,
} from "./publish";
