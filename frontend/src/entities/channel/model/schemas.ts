/**
 * Channel 엔티티 zod 스키마 정의
 */
import { z } from "zod";

// 플랫폼 타입
export const PlatformTypeSchema = z.enum([
  "youtube",
  "twitch",
  "facebook",
  "custom_rtmp",
]);

// 채널 연결 상태
export const ChannelStatusSchema = z.enum(["connected", "disconnected"]);

// 채널 스키마
export const ChannelSchema = z.object({
  id: z.string(),
  platform: PlatformTypeSchema,
  accountName: z.string(),
  status: ChannelStatusSchema,
  connectedAt: z.string().optional(),
  disconnectedAt: z.string().optional(),
});

// 채널 목록 응답 스키마
export const ChannelListResponseSchema = z.object({
  channels: z.array(ChannelSchema),
  total: z.number(),
});

// 플랫폼 정보 스키마
export const PlatformInfoSchema = z.object({
  type: PlatformTypeSchema,
  name: z.string(),
  icon: z.string(),
  description: z.string().optional(),
});

// 채널 연결 요청 스키마 (OAuth용, 현재 미사용)
export const ConnectChannelRequestSchema = z.object({
  platform: PlatformTypeSchema,
});

// 채널 연결 응답 스키마 (OAuth용, 현재 미사용)
export const ConnectChannelResponseSchema = z.object({
  authUrl: z.string().url("올바른 URL 형식이 아닙니다."),
});

// 백엔드 LocalDateTime: 문자열(ISO) 또는 Jackson 기본 배열 [year,month,day,hour,min,sec] 허용
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

// --- 백엔드 Core GET/POST /api/destinations 응답 (null 허용: Java optional 필드) ---
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

// --- 수동 등록: Core POST /api/destinations 요청/응답 ---
export const CreateDestinationRequestSchema = z.object({
  platform: z.string().min(1, "플랫폼은 필수입니다"),
  channelId: z.string().min(1, "채널 ID는 필수입니다"),
  channelName: z.string().optional(),
  rtmpUrl: z.string().optional(),
  streamKey: z.string().optional(),
});

export const ApiResponseDestinationSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: BackendDestinationResponseSchema,
});

// OAuth 콜백 응답 스키마
export const OAuthCallbackResponseSchema = z.object({
  channel: ChannelSchema.optional(),
  message: z.string(),
  redirectUrl: z.string().url().optional(),
});

const PLATFORM_KEYS = ["youtube", "twitch", "facebook", "custom_rtmp"] as const;

/** 백엔드 data[] → 프론트 Channel[] 매핑 (DELETE 시 destinationId 사용) */
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

/** 스키마 검증 없이 raw 객체 배열 → Channel[] (폴백용) */
export function safeMapRawDestinationsToChannels(raw: unknown): z.infer<typeof ChannelSchema>[] {
  if (!Array.isArray(raw)) return [];
  const PLATFORM_KEYS_SAFE = ["youtube", "twitch", "facebook", "custom_rtmp"] as const;
  return raw
    .filter((d): d is Record<string, unknown> => d != null && typeof d === "object")
    .filter((d) => d.isActive !== false)
    .map((d) => {
      const platformRaw = String(d.platform ?? "").toLowerCase();
      const platform = PLATFORM_KEYS_SAFE.includes(platformRaw as (typeof PLATFORM_KEYS_SAFE)[number])
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

// 타입 추론
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
