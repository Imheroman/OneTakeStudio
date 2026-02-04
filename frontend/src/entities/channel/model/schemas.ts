/**
 * Channel 엔티티 zod 스키마
 */
import { z } from "zod";

const PLATFORM_KEYS = ["youtube", "twitch", "facebook", "custom_rtmp"] as const;

export const PlatformTypeSchema = z.enum(PLATFORM_KEYS);
export const ChannelStatusSchema = z.enum(["connected", "disconnected"]);

export const ChannelSchema = z.object({
  id: z.string(),
  platform: PlatformTypeSchema,
  accountName: z.string(),
  status: ChannelStatusSchema,
  connectedAt: z.string().optional(),
  disconnectedAt: z.string().optional(),
});

export const ChannelListResponseSchema = z.object({
  channels: z.array(ChannelSchema),
  total: z.number(),
});

export const PlatformInfoSchema = z.object({
  type: PlatformTypeSchema,
  name: z.string(),
  icon: z.string(),
  description: z.string().optional(),
});

export const ConnectChannelRequestSchema = z.object({
  platform: PlatformTypeSchema,
});

export const ConnectChannelResponseSchema = z.object({
  authUrl: z.string().url("올바른 URL 형식이 아닙니다."),
});

const BackendCreatedAtSchema = z
  .union([z.string(), z.array(z.number())])
  .optional()
  .nullable()
  .transform((v) => {
    if (v == null) return undefined;
    if (typeof v === "string") return v;
    if (Array.isArray(v) && v.length >= 6)
      return new Date(v[0], v[1] - 1, v[2], v[3], v[4], v[5])
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    return undefined;
  });

export const BackendDestinationResponseSchema = z.object({
  id: z.number(),
  destinationId: z.string(),
  platform: z.string(),
  channelId: z.string().optional().nullable(),
  channelName: z.string().optional().nullable(),
  rtmpUrl: z.string().optional().nullable(),
  streamKey: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  createdAt: BackendCreatedAtSchema,
});

export const ApiResponseDestinationListSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.array(BackendDestinationResponseSchema),
});

export const CreateDestinationRequestSchema = z.object({
  platform: z.string().min(1, "플랫폼은 필수입니다"),
  channelId: z.string().min(1, "채널 ID는 필수입니다"),
  channelName: z.string().optional(),
  rtmpUrl: z.string().optional(),
  streamKey: z.string().optional(),
  /** OAuth access token (YouTube 등 외부 채팅 연동용) */
  accessToken: z.string().optional(),
  /** OAuth refresh token */
  refreshToken: z.string().optional(),
});

export const ApiResponseDestinationSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: BackendDestinationResponseSchema,
});

export const OAuthCallbackResponseSchema = z.object({
  channel: ChannelSchema.optional(),
  message: z.string(),
  redirectUrl: z.string().url().optional(),
});

export function mapDestinationListToChannels(
  data: z.infer<typeof BackendDestinationResponseSchema>[],
): z.infer<typeof ChannelSchema>[] {
  return (data ?? [])
    .filter((d) => d.isActive !== false)
    .map((d) => {
      const raw = (d.platform ?? "").toLowerCase();
      const platform = PLATFORM_KEYS.includes(raw as (typeof PLATFORM_KEYS)[number])
        ? (raw as z.infer<typeof PlatformTypeSchema>)
        : "custom_rtmp";
      return {
        id: d.destinationId,
        platform,
        accountName: d.channelName ?? d.channelId ?? "-",
        status: "connected" as const,
        connectedAt: d.createdAt ?? undefined,
      };
    });
}

export function safeMapRawDestinationsToChannels(raw: unknown): z.infer<typeof ChannelSchema>[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d): d is Record<string, unknown> => d != null && typeof d === "object")
    .filter((d) => d.isActive !== false)
    .map((d) => {
      const platformRaw = String(d.platform ?? "").toLowerCase();
      const platform = PLATFORM_KEYS.includes(platformRaw as (typeof PLATFORM_KEYS)[number])
        ? platformRaw
        : "custom_rtmp";
      const createdAt = d.createdAt;
      const connectedAt =
        typeof createdAt === "string"
          ? createdAt
          : Array.isArray(createdAt) && createdAt.length >= 6
            ? new Date(
                Number(createdAt[0]),
                Number(createdAt[1]) - 1,
                Number(createdAt[2]),
                Number(createdAt[3]),
                Number(createdAt[4]),
                Number(createdAt[5]),
              )
                .toISOString()
                .slice(0, 19)
            : undefined;
      return {
        id: String(d.destinationId ?? ""),
        platform: platform as z.infer<typeof PlatformTypeSchema>,
        accountName: String(d.channelName ?? d.channelId ?? "-"),
        status: "connected" as const,
        connectedAt,
      };
    });
}

export type PlatformType = z.infer<typeof PlatformTypeSchema>;
export type ChannelStatus = z.infer<typeof ChannelStatusSchema>;
export type Channel = z.infer<typeof ChannelSchema>;
export type ChannelListResponse = z.infer<typeof ChannelListResponseSchema>;
export type PlatformInfo = z.infer<typeof PlatformInfoSchema>;
export type ConnectChannelRequest = z.infer<typeof ConnectChannelRequestSchema>;
export type ConnectChannelResponse = z.infer<
  typeof ConnectChannelResponseSchema
>;
export type CreateDestinationRequest = z.infer<
  typeof CreateDestinationRequestSchema
>;
export type OAuthCallbackResponse = z.infer<
  typeof OAuthCallbackResponseSchema
>;
