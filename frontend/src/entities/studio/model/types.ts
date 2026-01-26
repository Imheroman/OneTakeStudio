/**
 * Studio 엔티티 타입 정의
 */

/**
 * 송출 타입
 */
export type TransmissionType = "live" | "saved_video";

/**
 * 저장 위치
 */
export type StorageLocation = "local" | "cloud";

/**
 * 송출 플랫폼
 */
export type Platform = "youtube" | "chzzk" | "twitch";

/**
 * 스튜디오 정보
 */
export interface Studio {
  id: string;
  title: string;
  description?: string;
  transmissionType: TransmissionType;
  storageLocation: StorageLocation;
  platforms: Platform[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * 스튜디오 생성 요청
 */
export interface CreateStudioRequest {
  title: string;
  description?: string;
  transmissionType: TransmissionType;
  storageLocation: StorageLocation;
  platforms: Platform[];
}

/**
 * 스튜디오 생성 응답
 */
export interface CreateStudioResponse {
  studio: Studio;
  message?: string;
}

/**
 * 레이아웃 타입
 */
export type LayoutType = "full" | "split" | "three-grid" | "four-grid" | "custom";

/**
 * 씬 정보
 */
export interface Scene {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * 소스 타입
 */
export type SourceType = "video" | "audio" | "image" | "text" | "browser";

/**
 * 소스 정보
 */
export interface Source {
  id: string;
  type: SourceType;
  name: string;
  isVisible: boolean;
}

/**
 * 스튜디오 상세 정보
 */
export interface StudioDetail extends Studio {
  currentLayout: LayoutType;
  scenes: Scene[];
  sources: Source[];
  isLive: boolean;
  elapsedTime?: string; // "12:12:25" 형식
}
