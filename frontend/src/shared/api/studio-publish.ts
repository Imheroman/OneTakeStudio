/**
 * 스튜디오 송출 API (Gateway: /api/v1/media/publish → Media /api/media/publish 재작성)
 */
import { z } from "zod";
import { apiClient } from "./client";

const PUBLISH_BASE = "/api/v1/media/publish";

const PublishResponseSchema = z.object({
  publishSessionId: z.string(),
  studioId: z.number(),
  status: z.string(),
  destinationIds: z.string().optional(),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

const ApiResponsePublishSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: PublishResponseSchema,
});

export type PublishStartRequest = {
  studioId: number;
  destinationIds: number[];
  streamSessionId?: string;
};

export type PublishResponse = z.infer<typeof PublishResponseSchema>;

/**
 * 송출 시작 (Go Live)
 * - Media 서비스: 활성 스트림 세션 필요, destinationIds는 Core ConnectedDestination.id(Long) 목록
 */
export async function startPublish(
  body: PublishStartRequest,
): Promise<PublishResponse> {
  const res = await apiClient.post(PUBLISH_BASE, ApiResponsePublishSchema, body);
  if (!res.success || !res.data) {
    throw new Error(res.message ?? "송출 시작에 실패했습니다.");
  }
  return res.data;
}

/**
 * 송출 중지
 */
export async function stopPublish(studioId: number): Promise<PublishResponse> {
  const res = await apiClient.post(
    `${PUBLISH_BASE}/stop?studioId=${studioId}`,
    ApiResponsePublishSchema,
  );
  if (!res.success || !res.data) {
    throw new Error(res.message ?? "송출 중지에 실패했습니다.");
  }
  return res.data;
}

const PublishStatusResponseSchema = z.object({
  publishSessionId: z.string(),
  studioId: z.number(),
  status: z.string(),
  destinations: z
    .array(
      z.object({
        destinationId: z.string().optional(),
        platform: z.string().optional(),
        status: z.string().optional(),
        rtmpUrl: z.string().optional(),
      }),
    )
    .optional(),
  startedAt: z.string().nullable().optional(),
});

const ApiResponsePublishStatusSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: PublishStatusResponseSchema,
});

export type PublishStatusResponse = z.infer<
  typeof PublishStatusResponseSchema
>;

/**
 * 송출 상태 조회
 */
export async function getPublishStatus(
  studioId: number,
): Promise<PublishStatusResponse> {
  const res = await apiClient.get(
    `${PUBLISH_BASE}/status?studioId=${studioId}`,
    ApiResponsePublishStatusSchema,
  );
  if (!res.success || !res.data) {
    throw new Error(res.message ?? "송출 상태 조회에 실패했습니다.");
  }
  return res.data;
}
