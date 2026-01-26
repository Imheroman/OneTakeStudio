/**
 * User 엔티티 타입 정의
 */

/**
 * 사용자 정보
 */
export interface User {
  id: string;
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
  username: string;
  password: string;
}

/**
 * 회원가입 요청 데이터
 */
export interface SignupRequest {
  username: string;
  password: string;
  name: string;
  nickname: string;
}
