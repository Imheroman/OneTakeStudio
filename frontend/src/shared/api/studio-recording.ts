/**
 * 스튜디오 녹화 API (Gateway: /api/recordings/**)
 */
import { apiClient } from "./client";
import {
  ApiResponseRecordingArraySchema,
  ApiResponseRecordingNullableSchema,
  ApiResponseRecordingSchema,
  type RecordingResponse,
  type RecordingStartRequest,
} from "@/entities/recording/model";

const RECORDINGS_BASE = "/api/recordings";

export async function startRecording(
  body: RecordingStartRequest,
): Promise<RecordingResponse> {
  const res = await apiClient.post(
    RECORDINGS_BASE + "/start",
    ApiResponseRecordingSchema,
    body,
  );
  return res.data;
}

export async function stopRecording(
  studioId: number,
): Promise<RecordingResponse> {
  const res = await apiClient.post(
    `${RECORDINGS_BASE}/${studioId}/stop`,
    ApiResponseRecordingSchema,
  );
  return res.data;
}

export async function pauseRecording(
  studioId: number,
): Promise<RecordingResponse> {
  const res = await apiClient.post(
    `${RECORDINGS_BASE}/${studioId}/pause`,
    ApiResponseRecordingSchema,
  );
  return res.data;
}

export async function resumeRecording(
  studioId: number,
): Promise<RecordingResponse> {
  const res = await apiClient.post(
    `${RECORDINGS_BASE}/${studioId}/resume`,
    ApiResponseRecordingSchema,
  );
  return res.data;
}

export async function getRecordingsByStudio(
  studioId: number,
): Promise<RecordingResponse[]> {
  const res = await apiClient.get(
    `${RECORDINGS_BASE}/studio/${studioId}`,
    ApiResponseRecordingArraySchema,
  );
  return res.data;
}

export async function getActiveRecording(
  studioId: number,
): Promise<RecordingResponse | null> {
  const res = await apiClient.get(
    `${RECORDINGS_BASE}/studio/${studioId}/active`,
    ApiResponseRecordingNullableSchema,
  );
  return res.data ?? null;
}

export async function getRecording(
  recordingId: string,
): Promise<RecordingResponse> {
  const res = await apiClient.get(
    `${RECORDINGS_BASE}/${recordingId}`,
    ApiResponseRecordingSchema,
  );
  return res.data;
}
