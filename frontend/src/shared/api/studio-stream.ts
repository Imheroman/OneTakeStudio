/**
 * 스튜디오 스트림 API (Gateway: /api/streams/**)
 * FSD: shared는 entities 미참조. dto/stream 사용.
 */
import { z } from "zod";
import { apiClient } from "./client";
import {
  ApiResponseStreamTokenSchema,
  ApiResponseStreamSessionSchema,
  type StreamJoinRequestDto,
  type StreamTokenResponseDto,
  type StreamSessionResponseDto,
} from "./dto/stream";

const STREAMS_BASE = "/api/streams";

export async function joinStream(
  body: StreamJoinRequestDto,
): Promise<StreamTokenResponseDto> {
  const res = await apiClient.post(
    `${STREAMS_BASE}/join`,
    ApiResponseStreamTokenSchema,
    body,
  );
  return res.data;
}

export async function leaveStream(studioId: string): Promise<void> {
  await apiClient.post(
    `${STREAMS_BASE}/${studioId}/leave`,
    z.object({ success: z.boolean(), message: z.string().optional() }),
  );
}

export async function endStream(studioId: string): Promise<void> {
  await apiClient.post(
    `${STREAMS_BASE}/${studioId}/end`,
    z.object({ success: z.boolean(), message: z.string().optional() }),
  );
}

export async function getActiveSession(
  studioId: string,
): Promise<StreamSessionResponseDto> {
  const res = await apiClient.get(
    `${STREAMS_BASE}/${studioId}/session`,
    ApiResponseStreamSessionSchema,
  );
  return res.data;
}
