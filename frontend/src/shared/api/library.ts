/**
 * 라이브러리(녹화 목록) API — Core Service /api/library/recordings
 * FSD: shared는 entities 미참조. dto/library 사용.
 */
import { apiClient } from "./client";
import {
  ApiResponseDataSchema,
  ApiResponseRecordingSchema,
  ApiResponseDownloadUrlSchema,
  ApiResponseStorageSchema,
  type RecordingDto,
  type RecordingStatusDto,
  type PaginationInfoDto,
  type LibraryVideoDto,
  type LibraryVideoStatusDto,
  type VideoDetailFromApiDto,
  type StorageDataFromApiDto,
} from "./dto/library";

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
  status: RecordingStatusDto
): LibraryVideoStatusDto {
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

function recordingToVideo(r: RecordingDto): LibraryVideoDto {
  const date = r.createdAt != null ? r.createdAt.slice(0, 10) : "";
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
  studioId?: string | number;
};

/**
 * 녹화 목록 조회 — 백엔드 /api/library/recordings
 */
export async function getRecordings(
  params: GetRecordingsParams = {}
): Promise<{
  videos: LibraryVideoDto[];
  total: number;
  pagination: PaginationInfoDto;
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

/**
 * 녹화 상세 조회 — GET /api/library/recordings/{recordingId}
 */
export async function getRecordingDetail(
  recordingId: string
): Promise<VideoDetailFromApiDto> {
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
    videoUrl: r.fileUrl ?? undefined,
    thumbnailUrl: r.thumbnailUrl ?? undefined,
    clips: [],
  };
}

/**
 * 다운로드 URL 조회 — GET /api/library/recordings/{recordingId}/download
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

export type VideoDetailFromApi = VideoDetailFromApiDto;
export type StorageDataFromApi = StorageDataFromApiDto;

/**
 * 스토리지 용량 조회 — GET /api/library/storage
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
    videoUsage: d.videoUsage ?? 0,
    assetUsage: d.assetUsage ?? 0,
    shortsUsage: d.shortsUsage ?? 0,
  };
}
