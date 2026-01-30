/**
 * 스튜디오 스트림 API (Gateway: /api/streams/**)
 * LiveKit 토큰 발급 및 스트림 세션 관리
 */
import { apiClient } from "./client";
import {
  ApiResponseStreamTokenSchema,
  ApiResponseStreamSessionSchema,
  type StreamJoinRequest,
  type StreamTokenResponse,
  type StreamSessionResponse,
} from "@/entities/stream/model";
import { z } from "zod";

const STREAMS_BASE = "/api/streams";

/**
 * 스트림 참가 (LiveKit 토큰 발급)
 */
export async function joinStream(
  body: StreamJoinRequest
): Promise<StreamTokenResponse> {
  const res = await apiClient.post(
    `${STREAMS_BASE}/join`,
    ApiResponseStreamTokenSchema,
    body
  );
  return res.data;
}

/**
 * 스트림 퇴장
 */
export async function leaveStream(studioId: number): Promise<void> {
  await apiClient.post(
    `${STREAMS_BASE}/${studioId}/leave`,
    z.object({ success: z.boolean(), message: z.string().optional() })
  );
}

/**
 * 스트림 종료 (호스트만)
 */
export async function endStream(studioId: number): Promise<void> {
  await apiClient.post(
    `${STREAMS_BASE}/${studioId}/end`,
    z.object({ success: z.boolean(), message: z.string().optional() })
  );
}

/**
 * 활성 스트림 세션 조회
 */
export async function getActiveSession(
  studioId: number
): Promise<StreamSessionResponse> {
  const res = await apiClient.get(
    `${STREAMS_BASE}/${studioId}/session`,
    ApiResponseStreamSessionSchema
  );
  return res.data;
}
