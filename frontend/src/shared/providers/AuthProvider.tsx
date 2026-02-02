"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { getTokenRemainingTime } from "@/shared/lib/jwt";

// 인증이 필요한 경로
const protectedPaths = [
  "/workspace",
  "/studio",
  "/library",
  "/channels",
  "/members",
  "/mypage",
  "/storage",
];

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, isLoggedIn, checkAuth, hasHydrated, logout } = useAuthStore();

  // 주기적 토큰 만료 체크
  useEffect(() => {
    if (!hasHydrated) return;

    // 초기 체크
    const isValid = checkAuth();

    // 보호된 경로에서 인증 실패 시 로그인으로 리다이렉트
    const isProtectedPath = protectedPaths.some((path) =>
      pathname.startsWith(path)
    );

    if (isProtectedPath && !isValid) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // 토큰이 유효하면 만료 전에 자동 로그아웃 타이머 설정
    if (isValid && accessToken) {
      const remainingTime = getTokenRemainingTime(accessToken);

      if (remainingTime > 0) {
        const timer = setTimeout(() => {
          console.log("[Auth] 토큰이 만료되었습니다.");
          logout();
          if (isProtectedPath) {
            router.push("/login");
          }
        }, remainingTime);

        return () => clearTimeout(timer);
      }
    }
  }, [hasHydrated, accessToken, isLoggedIn, pathname, checkAuth, logout, router]);

  // 쿠키 동기화 (토큰 만료 시 쿠키도 제거)
  useEffect(() => {
    if (!hasHydrated) return;

    const isAuthenticated = checkAuth();

    if (typeof document !== "undefined") {
      if (isAuthenticated) {
        document.cookie = "onetake-authenticated=true; path=/; max-age=86400";
      } else {
        document.cookie = "onetake-authenticated=; path=/; max-age=0";
      }
    }
  }, [hasHydrated, accessToken, checkAuth]);

  return <>{children}</>;
}
