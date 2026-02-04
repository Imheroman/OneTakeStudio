/**
 * 라이브러리(녹화 목록) API — Core Service /api/library/recordings
 * FSD: shared는 entities 미참조. dto/library 사용.
 */
import { apiClient } from "./client";
import {
  ApiResponseDataSchema,
  ApiResponseRecordingSchema,
  ApiResponseDownloadUrlSchema,
  StorageResponseDirectSchema,
  StorageFilesResponseDirectSchema,
  ApiResponseCommentAnalysisSchema,
  ApiResponseMarkersSchema,
  type RecordingDto,
  type RecordingStatusDto,
  type PaginationInfoDto,
  type LibraryVideoDto,
  type LibraryVideoStatusDto,
  type VideoDetailFromApiDto,
  type StorageDataFromApiDto,
  type StorageFileItemDto,
  type CommentAnalysisResponseDto,
  type MarkerDto,
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

function mapRecordingStatus(status: RecordingStatusDto): LibraryVideoStatusDto {
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
  studioId?: number;
};

/**
 * 녹화 목록 조회 — 백엔드 /api/library/recordings
 */
export async function getRecordings(params: GetRecordingsParams = {}): Promise<{
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

  // 목업: 라이브러리 디테일에서 쇼츠(클립) 생성된 상태를 보여주기 위한 데이터
  const mockClipsByRecordingId: Record<
    string,
    Array<{
      id: string;
      title: string;
      duration: string;
      url: string | null;
      thumbnailUrl: string | null;
      status?: string;
    }>
  > = {
    "rec-1": [
      {
        id: "clip-1",
        title: "하이라이트 1 (오프닝)",
        duration: "0:27",
        url: r.s3Url ?? null,
        thumbnailUrl: r.thumbnailUrl ?? null,
        status: "READY",
      },
      {
        id: "clip-2",
        title: "하이라이트 2 (핵심 토크)",
        duration: "0:35",
        url: r.s3Url ?? null,
        thumbnailUrl: r.thumbnailUrl ?? null,
        status: "READY",
      },
      {
        id: "clip-3",
        title: "하이라이트 3 (클로징)",
        duration: "0:22",
        url: r.s3Url ?? null,
        thumbnailUrl: r.thumbnailUrl ?? null,
        status: "READY",
      },
    ],
    "rec-2": [
      {
        id: "clip-1",
        title: "Shorts 1",
        duration: "0:20",
        url: r.s3Url ?? null,
        thumbnailUrl: r.thumbnailUrl ?? null,
        status: "READY",
      },
      {
        id: "clip-2",
        title: "Shorts 2",
        duration: "0:18",
        url: r.s3Url ?? null,
        thumbnailUrl: r.thumbnailUrl ?? null,
        status: "READY",
      },
    ],
  };
  return {
    id: r.recordingId,
    title: r.title || "제목 없음",
    date,
    duration: formatDuration(r.durationSeconds ?? undefined),
    description: r.description ?? undefined,
    videoUrl: r.s3Url ?? undefined,
    thumbnailUrl: r.thumbnailUrl ?? undefined,
    clips: mockClipsByRecordingId[recordingId] ?? [],
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
 * 시간대별 댓글 개수 분석 — GET /api/library/recordings/{recordingId}/comment-analysis
 *
 * 이 엔드포인트는 Next.js API Route(목업)에만 존재합니다.
 * apiClient baseURL이 백엔드(8080 등)로 설정되어 있어도, 항상 같은 origin(3000)으로
 * 요청하여 MSW 또는 Next.js API Route가 처리하도록 합니다.
 */
export async function getCommentAnalysis(
  recordingId: string
): Promise<CommentAnalysisResponseDto> {
  const url = `/api/library/recordings/${recordingId}/comment-analysis`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`댓글 분석 조회 실패: ${res.status}`);
  }
  const raw = await res.json();
  const parsed = ApiResponseCommentAnalysisSchema.parse(raw);
  return parsed.data;
}

/**
 * 녹화별 북마크(마커) 목록 — GET /api/library/recordings/{recordingId}/markers
 */
export async function getMarkers(recordingId: string): Promise<MarkerDto[]> {
  const url = `/api/library/recordings/${recordingId}/markers`;
  const res = await fetch(url);
  if (!res.ok) {
    return [];
  }
  const raw = await res.json();
  const parsed = ApiResponseMarkersSchema.parse(raw);
  return parsed.data.markers ?? [];
}

/**
 * 스토리지 용량 조회 — GET /api/storage (StorageController)
 * 백엔드는 ApiResponse 래퍼 없이 직접 반환
 */
export async function getStorage(): Promise<StorageDataFromApi> {
  const response = await apiClient.get(
    "/api/storage",
    StorageResponseDirectSchema
  );
  return {
    used: response.used,
    total: response.total,
    available: response.available,
    videoUsage: response.videoUsage ?? 0,
    assetUsage: response.assetUsage ?? 0,
  };
}

export type GetStorageFilesParams = {
  page?: number;
  size?: number;
};

export type GetStorageFilesResult = {
  files: StorageFileItemDto[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
};

/**
 * 스토리지 파일 목록 조회 — GET /api/storage/files (StorageController)
 * 백엔드는 ApiResponse 래퍼 없이 직접 반환
 * videoCount는 totalElements로, videoLimit은 50 고정
 */
export async function getStorageFiles(
  params?: GetStorageFilesParams
): Promise<GetStorageFilesResult> {
  const { page = 0, size = 50 } = params ?? {};
  const searchParams = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  const response = await apiClient.get(
    `/api/storage/files?${searchParams.toString()}`,
    StorageFilesResponseDirectSchema
  );
  return {
    files: response.files,
    totalElements: response.totalElements,
    totalPages: response.totalPages,
    currentPage: response.currentPage,
  };
}
