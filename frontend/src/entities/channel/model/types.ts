/**
 * Channel 엔티티 타입 정의
 */

/**
 * 플랫폼 타입
 */
export type PlatformType = "youtube" | "twitch" | "facebook" | "custom_rtmp";

/**
 * 채널 연결 상태
 */
export type ChannelStatus = "connected" | "disconnected";

/**
 * 채널 정보
 */
export interface Channel {
  id: string;
  platform: PlatformType;
  accountName: string; // 계정명 (이메일, 사용자명, URL 등)
  status: ChannelStatus;
  connectedAt?: string; // 연결된 날짜
  disconnectedAt?: string; // 연결 해제된 날짜
}

/**
 * 채널 목록 응답
 */
export interface ChannelListResponse {
  channels: Channel[];
  total: number;
}

/**
 * 플랫폼 정보
 */
export interface PlatformInfo {
  type: PlatformType;
  name: string;
  icon: string; // 아이콘 이름 또는 URL
  description?: string;
}
