/**
 * JWT 토큰 유틸리티
 */

interface JwtPayload {
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  nickname?: string;
  type?: string;
  [key: string]: any;
}

/**
 * JWT 토큰을 디코딩합니다 (검증 없이 payload만 추출)
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * JWT 토큰이 만료되었는지 확인합니다
 * @param token JWT 토큰
 * @param bufferSeconds 만료 전 버퍼 시간 (초). 기본 60초
 */
export function isTokenExpired(token: string | null, bufferSeconds = 60): boolean {
  if (!token) {
    return true;
  }

  const payload = decodeJwt(token);
  if (!payload || !payload.exp) {
    return true;
  }

  // 현재 시간 (초 단위) + 버퍼
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + bufferSeconds;
}

/**
 * 토큰의 남은 유효 시간을 반환합니다 (밀리초)
 */
export function getTokenRemainingTime(token: string | null): number {
  if (!token) {
    return 0;
  }

  const payload = decodeJwt(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  const remaining = (payload.exp - now) * 1000;
  return Math.max(0, remaining);
}
