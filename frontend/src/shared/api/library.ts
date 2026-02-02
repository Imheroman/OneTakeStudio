/**
 * 라이브러리(녹화 목록) API — Core Service /api/library/recordings
 * 백엔드 ApiResponse<RecordingListResponse> 형식에 맞춤.
 */
import { z } from "zod";
import { apiClient } from "./client";
import type { Video, VideoStatus } from "@/entities/video/model";

// 백엔드 RecordingStatus
const RecordingStatusSchema = z.enum([
  "RECORDING",
  "PROCESSING",
  "READY",
  "DELETED",
  "FAILED",
]);

const RecordingSchema = z.object({
  recordingId: z.string(),
  studioId: z.number(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  s3Url: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  status: RecordingStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const PaginationInfoSchema = z.object({
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
});

const RecordingListResponseSchema = z.object({
  recordings: z.array(RecordingSchema),
  pagination: PaginationInfoSchema,
});

const ApiResponseDataSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: RecordingListResponseSchema,
});

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function mapRecordingStatus(
  status: z.infer<typeof RecordingStatusSchema>
): VideoStatus {
  switch (status) {
    case "READY":
      return "Saved";
    case "PROCESSING":
    case "RECORDING":
      return "Processing";
    case "FAILED":
      return "Failed";
    default:
      return "Processing";
  }
}

function recordingToVideo(
  r: z.infer<typeof RecordingSchema>
): Video {
  const date =
    r.createdAt != null
      ? r.createdAt.slice(0, 10)
      : "";
  return {
    id: r.recordingId,
    title: r.title || "제목 없음",
    date,
    duration: formatDuration(r.durationSeconds ?? undefined),
    type: "original",
    status: mapRecordingStatus(r.status),
    thumbnailUrl: r.thumbnailUrl ?? undefined,
  };
}

export type GetRecordingsParams = {
  page?: number;
  size?: number;
  studioId?: number;
};

/**
 * 녹화 목록 조회 — 백엔드 /api/library/recordings
 * 응답을 Video[] 및 total로 변환하여 반환.
 */
export async function getRecordings(params: GetRecordingsParams = {}): Promise<{
  videos: Video[];
  total: number;
  pagination: z.infer<typeof PaginationInfoSchema>;
}> {
  const { page = 0, size = 20, studioId } = params;
  const searchParams = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (studioId != null) {
    searchParams.set("studioId", String(studioId));
  }
  const url = `/api/library/recordings?${searchParams.toString()}`;
  const response = await apiClient.get(url, ApiResponseDataSchema);
  const { recordings, pagination } = response.data;
  const videos = recordings.map(recordingToVideo);
  return {
    videos,
    total: Number(pagination.totalElements),
    pagination,
  };
}

// --- 상세 조회 / 다운로드 URL ---

const ApiResponseRecordingSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: RecordingSchema,
});

const DownloadUrlResponseSchema = z.object({
  downloadUrl: z.string(),
  expiresIn: z.number().optional(),
});

const ApiResponseDownloadUrlSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: DownloadUrlResponseSchema,
});

export type VideoDetailFromApi = {
  id: string;
  title: string;
  date: string;
  duration: string;
  description?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  clips?: Array<{ id: string; title: string; duration?: string; url?: string | null; thumbnailUrl?: string | null; status?: string }>;
};

/**
 * 녹화 상세 조회 — GET /api/library/recordings/{recordingId}
 * VideoDetail 형태로 변환하여 반환.
 */
export async function getRecordingDetail(
  recordingId: string
): Promise<VideoDetailFromApi> {
  const response = await apiClient.get(
    `/api/library/recordings/${recordingId}`,
    ApiResponseRecordingSchema
  );
  const r = response.data;
  const date = r.createdAt != null ? r.createdAt.slice(0, 10) : "";
  return {
    id: r.recordingId,
    title: r.title || "제목 없음",
    date,
    duration: formatDuration(r.durationSeconds ?? undefined),
    description: r.description ?? undefined,
    videoUrl: r.s3Url ?? undefined,
    thumbnailUrl: r.thumbnailUrl ?? undefined,
    clips: [],
  };
}

/**
 * 다운로드 URL 조회 — GET /api/library/recordings/{recordingId}/download
 * data.downloadUrl 반환.
 */
export async function getRecordingDownloadUrl(
  recordingId: string
): Promise<string> {
  const response = await apiClient.get(
    `/api/library/recordings/${recordingId}/download`,
    ApiResponseDownloadUrlSchema
  );
  return response.data.downloadUrl;
}

// --- 스토리지 ---

const StorageResponseSchema = z.object({
  usedBytes: z.number(),
  limitBytes: z.number(),
  usedPercentage: z.number().optional(),
  usedFormatted: z.string().optional(),
  limitFormatted: z.string().optional(),
});

const ApiResponseStorageSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: StorageResponseSchema,
});

export type StorageDataFromApi = {
  used: number;
  total: number;
  available?: number;
  videoUsage?: number;
  assetUsage?: number;
};

/**
 * 스토리지 용량 조회 — GET /api/library/storage
 * used/total은 GB 단위로 변환하여 반환 (프론트 표시용).
 */
export async function getStorage(): Promise<StorageDataFromApi> {
  const response = await apiClient.get(
    "/api/library/storage",
    ApiResponseStorageSchema
  );
  const d = response.data;
  const gb = 1024 ** 3;
  return {
    used: d.usedBytes / gb,
    total: d.limitBytes / gb,
    videoUsage: 0,
    assetUsage: 0,
  };
}
