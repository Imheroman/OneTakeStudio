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
