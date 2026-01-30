/** Channel 엔티티 모델 */
export type {
  Channel,
  ChannelStatus,
  PlatformType,
  ChannelListResponse,
  PlatformInfo,
  ConnectChannelRequest,
  ConnectChannelResponse,
  CreateDestinationRequest,
  OAuthCallbackResponse,
} from "./schemas";

export {
  ChannelSchema,
  ChannelListResponseSchema,
  PlatformInfoSchema,
  ConnectChannelRequestSchema,
  ConnectChannelResponseSchema,
  CreateDestinationRequestSchema,
  ApiResponseDestinationSchema,
  OAuthCallbackResponseSchema,
  ApiResponseDestinationListSchema,
  BackendDestinationResponseSchema,
  mapDestinationListToChannels,
  safeMapRawDestinationsToChannels,
} from "./schemas";

export { DeleteResponseSchema } from "@/shared/api/schemas";
