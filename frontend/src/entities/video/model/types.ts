/**
 * Video 엔티티 타입 정의
 */

/**
 * 비디오 상태
 */
export type VideoStatus = "Uploaded" | "Saved" | "Processing" | "Failed";

/**
 * 비디오 타입
 */
export type VideoType = "original" | "shorts";

/**
 * 비디오 정보
 */
export interface Video {
  id: number;
  title: string;
  date: string;
  duration: string; // "42:18" 형식
  type: VideoType;
  status: VideoStatus;
  thumbnailUrl?: string;
}

/**
 * 비디오 목록 응답
 */
export interface VideoListResponse {
  videos: Video[];
  total: number;
}
