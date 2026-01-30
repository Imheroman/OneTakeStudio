/**
 * Channel 엔티티 모델 export
 */
// 타입 export (zod 스키마에서 추론)
export type {
  Channel,
  ChannelStatus,
  PlatformType,
  ChannelListResponse,
  PlatformInfo,
  ConnectChannelRequest,
  ConnectChannelResponse,
  OAuthCallbackResponse,
} from "./schemas";

// 스키마 export
export {
  ChannelSchema,
  ChannelListResponseSchema,
  PlatformInfoSchema,
  ConnectChannelRequestSchema,
  ConnectChannelResponseSchema,
  OAuthCallbackResponseSchema,
  ApiResponseDestinationListSchema,
  BackendDestinationResponseSchema,
  mapDestinationListToChannels,
} from "./schemas";

// 공통 스키마 re-export
export { DeleteResponseSchema } from "@/shared/api/schemas";
