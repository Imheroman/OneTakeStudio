/**
 * User 엔티티 타입 정의
 */

/**
 * 사용자 정보
 */
export interface User {
  id: string; // 서버에서 생성된 고유 ID (UUID 등)
  email: string;
  name: string;
}

/**
 * 로그인/회원가입 API 응답
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  message?: string;
}

/**
 * 로그인 요청 데이터
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 회원가입 요청 데이터
 */
export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  nickname: string;
}
