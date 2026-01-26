/**
 * Favorite 엔티티 타입 정의
 */

/**
 * 즐겨찾기 파트너 정보
 */
export interface Favorite {
  id: string; // 사용자 ID
  nickname: string; // 닉네임
  email?: string; // 이메일 (선택적)
}

/**
 * 즐겨찾기 목록 응답
 */
export interface FavoriteListResponse {
  favorites: Favorite[];
  total: number;
  maxCount: number; // 최대 등록 가능 수
}

/**
 * 사용자 검색 결과
 */
export interface UserSearchResult {
  id: string;
  nickname: string;
  email: string;
}

/**
 * 사용자 검색 응답
 */
export interface UserSearchResponse {
  users: UserSearchResult[];
}
