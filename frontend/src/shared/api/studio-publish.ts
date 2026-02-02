/**
 * 스튜디오 송출 API (Gateway: /api/publish/**)
 * FSD: shared는 entities 미참조. dto/publish 사용.
 */
import { apiClient } from "./client";
import {
  ApiResponsePublishSchema,
  ApiResponsePublishStatusSchema,
  type PublishStartRequestDto,
  type PublishResponseDto,
  type PublishStatusResponseDto,
} from "./dto/publish";

const PUBLISH_BASE = "/api/publish";

export async function startPublish(
  body: PublishStartRequestDto,
): Promise<PublishResponseDto> {
  const res = await apiClient.post(
    PUBLISH_BASE,
    ApiResponsePublishSchema,
    body,
  );
  return res.data;
}

export async function stopPublish(
  studioId: number,
): Promise<PublishResponseDto> {
  const res = await apiClient.post(
    `${PUBLISH_BASE}/stop?studioId=${studioId}`,
    ApiResponsePublishSchema,
  );
  return res.data;
}

export async function getPublishStatus(
  studioId: number,
): Promise<PublishStatusResponseDto> {
  const res = await apiClient.get(
    `${PUBLISH_BASE}/status?studioId=${studioId}`,
    ApiResponsePublishStatusSchema,
  );
  return res.data;
}
