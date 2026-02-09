/**
 * 스튜디오 녹화 API (Gateway: /api/recordings/**)
 * FSD: shared는 entities 미참조. dto/recording 사용.
 */
import { apiClient } from "./client";
import {
  ApiResponseRecordingArraySchema,
  ApiResponseRecordingNullableSchema,
  ApiResponseRecordingSchema,
  type RecordingResponseDto,
  type RecordingStartRequestDto,
} from "./dto/recording";

const RECORDINGS_BASE = "/api/recordings";

export async function startRecording(
  body: RecordingStartRequestDto,
): Promise<RecordingResponseDto> {
  const res = await apiClient.post(
    RECORDINGS_BASE + "/start",
    ApiResponseRecordingSchema,
    body,
  );
  return res.data;
}

export async function stopRecording(
  studioId: string,
): Promise<RecordingResponseDto> {
  const res = await apiClient.post(
    `${RECORDINGS_BASE}/${studioId}/stop`,
    ApiResponseRecordingSchema,
  );
  return res.data;
}

export async function pauseRecording(
  studioId: string,
): Promise<RecordingResponseDto> {
  const res = await apiClient.post(
    `${RECORDINGS_BASE}/${studioId}/pause`,
    ApiResponseRecordingSchema,
  );
  return res.data;
}

export async function resumeRecording(
  studioId: string,
): Promise<RecordingResponseDto> {
  const res = await apiClient.post(
    `${RECORDINGS_BASE}/${studioId}/resume`,
    ApiResponseRecordingSchema,
  );
  return res.data;
}

export async function getRecordingsByStudio(
  studioId: string,
): Promise<RecordingResponseDto[]> {
  const res = await apiClient.get(
    `${RECORDINGS_BASE}/studio/${studioId}`,
    ApiResponseRecordingArraySchema,
  );
  return res.data;
}

export async function getActiveRecording(
  studioId: string,
): Promise<RecordingResponseDto | null> {
  const res = await apiClient.get(
    `${RECORDINGS_BASE}/studio/${studioId}/active`,
    ApiResponseRecordingNullableSchema,
  );
  return res.data ?? null;
}

export async function getRecording(
  recordingId: string,
): Promise<RecordingResponseDto> {
  const res = await apiClient.get(
    `${RECORDINGS_BASE}/${recordingId}`,
    ApiResponseRecordingSchema,
  );
  return res.data;
}
