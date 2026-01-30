/**
 * 스튜디오 송출 API (Gateway: /api/publish/**)
 * RTMP 송출 시작/중지/상태 조회
 */
import { apiClient } from "./client";
import {
  ApiResponsePublishSchema,
  ApiResponsePublishStatusSchema,
  type PublishStartRequest,
  type PublishResponse,
  type PublishStatusResponse,
} from "@/entities/publish/model";

const PUBLISH_BASE = "/api/publish";

/**
 * 송출 시작
 */
export async function startPublish(
  body: PublishStartRequest
): Promise<PublishResponse> {
  const res = await apiClient.post(
    PUBLISH_BASE,
    ApiResponsePublishSchema,
    body
  );
  return res.data;
}

/**
 * 송출 중지
 */
export async function stopPublish(studioId: number): Promise<PublishResponse> {
  const res = await apiClient.post(
    `${PUBLISH_BASE}/stop?studioId=${studioId}`,
    ApiResponsePublishSchema
  );
  return res.data;
}

/**
 * 송출 상태 조회
 */
export async function getPublishStatus(
  studioId: number
): Promise<PublishStatusResponse> {
  const res = await apiClient.get(
    `${PUBLISH_BASE}/status?studioId=${studioId}`,
    ApiResponsePublishStatusSchema
  );
  return res.data;
}
