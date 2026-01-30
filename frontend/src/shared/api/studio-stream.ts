/**
 * 스튜디오 스트림( LiveKit ) API
 * Gateway: /api/v1/media/** → Media /api/media/**
 */
import { z } from "zod";
import { apiClient } from "./client";

const STREAM_BASE = "/api/v1/media/stream";

const StreamTokenResponseSchema = z.object({
  token: z.string(),
  roomName: z.string(),
  participantIdentity: z.string(),
  livekitUrl: z.string(),
});

const ApiResponseStreamTokenSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: StreamTokenResponseSchema,
});

export type StreamTokenRequest = {
  studioId: number;
  participantName: string;
  metadata?: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
};

export type StreamTokenResponse = z.infer<typeof StreamTokenResponseSchema>;

/**
 * 스트림 참여(토큰 발급) - Go Live 전에 호출하여 LiveKit 룸에 연결할 토큰을 받습니다.
 */
export async function joinStream(
  body: StreamTokenRequest,
): Promise<StreamTokenResponse> {
  const res = await apiClient.post(
    `${STREAM_BASE}/join`,
    ApiResponseStreamTokenSchema,
    body,
  );
  if (!res.success || !res.data) {
    throw new Error(res.message ?? "스트림 토큰 발급에 실패했습니다.");
  }
  return res.data;
}

/**
 * 스트림 퇴장 - 스튜디오 나갈 때 또는 방송 종료 후 호출
 */
export async function leaveStream(studioId: number): Promise<void> {
  await apiClient.post(
    `${STREAM_BASE}/${studioId}/leave`,
    z.object({ success: z.boolean(), message: z.string().optional() }),
  );
}
